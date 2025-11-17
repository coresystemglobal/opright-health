import { Patient } from '../models/patient.model';
import { Appointment } from '../models/appointment.model';

interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
}

interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: Array<{
    use?: string;
    system?: string;
    value: string;
  }>;
  name?: Array<{
    use?: string;
    family: string;
    given: string[];
  }>;
  telecom?: Array<{
    system: string;
    value: string;
    use?: string;
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: Array<{
    use?: string;
    text: string;
  }>;
}

export class FHIRService {
  static patientToFHIR(patient: Patient): FHIRPatient {
    return {
      resourceType: 'Patient',
      id: patient.id,
      meta: {
        lastUpdated: patient.updatedAt.toISOString()
      },
      identifier: [
        {
          use: 'usual',
          system: 'http://hospital.local/patient-id',
          value: patient.mrn
        }
      ],
      name: [
        {
          use: 'official',
          family: patient.last_name,
          given: [patient.first_name]
        }
      ],
      telecom: patient.phone ? [
        {
          system: 'phone',
          value: patient.phone,
          use: 'home'
        }
      ] : undefined,
      gender: patient.gender as any,
      birthDate: patient.date_of_birth.toISOString().split('T')[0],
      address: patient.address ? [
        {
          use: 'home',
          text: patient.address
        }
      ] : undefined
    };
  }

  static fhirToPatient(fhirPatient: FHIRPatient): Partial<Patient> {
    const name = fhirPatient.name?.[0];
    const phone = fhirPatient.telecom?.find(t => t.system === 'phone')?.value;
    const address = fhirPatient.address?.[0]?.text;

    return {
      first_name: name?.given[0] || '',
      last_name: name?.family || '',
      phone,
      gender: fhirPatient.gender as any,
      date_of_birth: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : undefined,
      address
    };
  }

  static appointmentToFHIR(appointment: Appointment): any {
    return {
      resourceType: 'Appointment',
      id: appointment.id,
      meta: {
        lastUpdated: appointment.updatedAt.toISOString()
      },
      status: appointment.status,
      serviceType: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/service-type',
              code: appointment.appointment_type,
              display: appointment.appointment_type.replace('_', ' ')
            }
          ]
        }
      ],
      start: `${appointment.appointment_date}T${appointment.appointment_time}`,
      end: appointment.end_time,
      participant: [
        {
          actor: {
            reference: `Patient/${appointment.patient_id}`
          },
          status: 'accepted'
        },
        {
          actor: {
            reference: `Practitioner/${appointment.doctor_id}`
          },
          status: 'accepted'
        }
      ]
    };
  }

  static validateFHIRResource(resource: FHIRResource): boolean {
    return !!(resource.resourceType && 
             ['Patient', 'Appointment', 'Observation', 'DiagnosticReport'].includes(resource.resourceType));
  }
}