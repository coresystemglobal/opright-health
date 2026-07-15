import { Op, Transaction } from 'sequelize';
import { Person, Patient, AuditLog } from '../../models';
import { PersonStatus, PersonGender } from '@modules/mpi/person.model';
import { AuditAction } from '@modules/audit/audit-log.model';
import { ValidationUtil } from '@utils/validation.util';

interface PersonIdentityInput {
  national_id?: string;
  verified_email?: string;
  verified_phone?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string | Date;
  gender?: string;
}

function toPersonGender(g?: string): PersonGender | undefined {
  if (!g) return undefined;
  return (Object.values(PersonGender) as string[]).includes(g) ? (g as PersonGender) : PersonGender.UNKNOWN;
}

function toDateOnly(d?: string | Date): string | undefined {
  if (!d) return undefined;
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** Follow a merged tombstone to its surviving Person. */
async function resolveSurvivor(person: Person): Promise<Person> {
  let current = person;
  const seen = new Set<string>([current.id]);
  while (current.status === PersonStatus.MERGED && current.merged_into_id && !seen.has(current.merged_into_id)) {
    const next = await Person.findByPk(current.merged_into_id);
    if (!next) break;
    seen.add(next.id);
    current = next;
  }
  return current;
}

export const personService = {
  /**
   * Deterministic identity resolution used on the patient-create path.
   * v1 matches ONLY on national_id (a strong key) to avoid dangerous false
   * merges. Returns an existing Person if the national_id is known, otherwise
   * creates a `verified` Person. Returns null when no national_id is supplied
   * (the patient simply stays unlinked).
   */
  resolveOrCreatePerson: async (input: PersonIdentityInput, transaction?: Transaction): Promise<Person | null> => {
    const nationalId = input.national_id?.trim();
    if (!nationalId) return null;

    const existing = await Person.findOne({
      where: { national_id: nationalId, status: { [Op.ne]: PersonStatus.MERGED } },
      transaction
    });
    if (existing) return resolveSurvivor(existing);

    return Person.create({
      national_id: nationalId,
      verified_email: input.verified_email || null,
      verified_phone: input.verified_phone || null,
      first_name: input.first_name || null,
      middle_name: input.middle_name || null,
      last_name: input.last_name || null,
      date_of_birth: toDateOnly(input.date_of_birth) || null,
      gender: toPersonGender(input.gender) || null,
      status: PersonStatus.VERIFIED
    } as any, { transaction });
  },

  getPersonById: async (id: string) => {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid person ID format');
    const person = await Person.findByPk(id);
    if (!person) throw new Error('Person not found');
    return person;
  },

  /** Admin candidate search — surfaces potential matches without auto-linking. */
  searchPersons: async (filters: { national_id?: string; last_name?: string; date_of_birth?: string }) => {
    const where: any = { status: { [Op.ne]: PersonStatus.MERGED } };
    if (filters.national_id) where.national_id = filters.national_id.trim();
    if (filters.last_name) where.last_name = { [Op.iLike]: `%${filters.last_name}%` };
    if (filters.date_of_birth) where.date_of_birth = filters.date_of_birth.slice(0, 10);
    if (!filters.national_id && !filters.last_name && !filters.date_of_birth) {
      throw new Error('At least one search filter is required');
    }
    return Person.findAll({ where, order: [['last_name', 'ASC']], limit: 50 });
  },

  /**
   * Link a tenant-scoped Patient to a Person. The patient is loaded WITH a
   * tenant filter (so a caller cannot link another tenant's patient). Either
   * link to an existing `personId`, or mint a new Person from `personDraft`.
   */
  linkPatientToPerson: async (
    patientId: string,
    tenantId: string,
    opts: { personId?: string; personDraft?: PersonIdentityInput },
    actorUserId?: string
  ) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
    const patient = await Patient.findOne({ where: { id: patientId, tenant_id: tenantId } });
    if (!patient) throw new Error('Patient not found');

    let person: Person | null = null;
    if (opts.personId) {
      person = await Person.findByPk(opts.personId);
      if (!person) throw new Error('Person not found');
      person = await resolveSurvivor(person);
    } else if (opts.personDraft) {
      person = await personService.resolveOrCreatePerson(opts.personDraft);
      if (!person) {
        // No national_id in the draft → create a provisional Person from demographics.
        person = await Person.create({
          verified_email: opts.personDraft.verified_email || null,
          verified_phone: opts.personDraft.verified_phone || null,
          first_name: opts.personDraft.first_name || patient.first_name,
          middle_name: opts.personDraft.middle_name || null,
          last_name: opts.personDraft.last_name || patient.last_name,
          date_of_birth: toDateOnly(opts.personDraft.date_of_birth) || null,
          gender: toPersonGender(opts.personDraft.gender) || null,
          status: PersonStatus.PROVISIONAL
        } as any);
      }
    } else {
      throw new Error('Either personId or personDraft is required');
    }

    const previous = patient.person_id || null;
    await patient.update({ person_id: person.id });

    await AuditLog.create({
      tenant_id: tenantId,
      user_id: actorUserId || null,
      action: AuditAction.UPDATE,
      resource: 'patient.person_link',
      resource_id: patient.id,
      old_values: { person_id: previous },
      new_values: { person_id: person.id }
    } as any).catch(() => { /* audit is best-effort */ });

    return { patient, person };
  },

  /** Detach a patient from its Person (correcting a mis-link). */
  unlinkPatientFromPerson: async (patientId: string, tenantId: string, actorUserId?: string) => {
    if (!ValidationUtil.isValidUUID(patientId)) throw new Error('Invalid patient ID format');
    const patient = await Patient.findOne({ where: { id: patientId, tenant_id: tenantId } });
    if (!patient) throw new Error('Patient not found');
    const previous = patient.person_id || null;
    await patient.update({ person_id: null });
    await AuditLog.create({
      tenant_id: tenantId,
      user_id: actorUserId || null,
      action: AuditAction.UPDATE,
      resource: 'patient.person_unlink',
      resource_id: patient.id,
      old_values: { person_id: previous },
      new_values: { person_id: null }
    } as any).catch(() => { /* best-effort */ });
    return patient;
  }
};
