import { Response } from 'express';
import { FHIRService } from '@modules/fhir/fhir.service';

import { Patient } from '@modules/patients/patient.model';

import { Appointment } from '@modules/appointments/appointment.model';

import { ResponseUtil } from '@utils/response.util';
import { TenantRequest } from '@middlewares/tenant.middleware';

export class FHIRController {
  static async getPatient(req: TenantRequest, res: Response) {
    try {
      const patient = await Patient.findOne({
        where: { id: req.params.id, tenant_id: req.tenant!.id }
      });

      if (!patient) {
        return res.status(404).json({
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: 'Patient not found'
          }]
        });
      }

      const fhirPatient = FHIRService.patientToFHIR(patient);
      return res.json(fhirPatient);
    } catch (error: any) {
      return res.status(500).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'exception',
          diagnostics: error.message
        }]
      });
    }
  }

  static async createPatient(req: TenantRequest, res: Response) {
    try {
      if (!FHIRService.validateFHIRResource(req.body)) {
        return res.status(400).json({
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'invalid',
            diagnostics: 'Invalid FHIR resource'
          }]
        });
      }

      const patientData = FHIRService.fhirToPatient(req.body);
      const patient = await Patient.create({
        ...patientData,
        tenant_id: req.tenant!.id
      });

      const fhirPatient = FHIRService.patientToFHIR(patient);
      return res.status(201).json(fhirPatient);
    } catch (error: any) {
      return res.status(500).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'exception',
          diagnostics: error.message
        }]
      });
    }
  }

  static async getAppointment(req: TenantRequest, res: Response) {
    try {
      const appointment = await Appointment.findByPk(req.params.id);
      if (!appointment) {
        return res.status(404).json({
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: 'Appointment not found'
          }]
        });
      }

      const fhirAppointment = FHIRService.appointmentToFHIR(appointment);
      return res.json(fhirAppointment);
    } catch (error: any) {
      return res.status(500).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'exception',
          diagnostics: error.message
        }]
      });
    }
  }
}