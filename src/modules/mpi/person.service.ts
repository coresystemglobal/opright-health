import { Op, Transaction } from 'sequelize';
import { Person, Patient, AuditLog, User } from '../../models';
import { PersonStatus, PersonGender } from '@modules/mpi/person.model';
import { AuditAction } from '@modules/audit/audit-log.model';
import { getPlatformTenant } from '@config/platform.config';
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

  /**
   * Direct-to-consumer self-enrollment. Gives an authenticated user (who
   * belongs to no hospital) a Patient record under the platform tenant, linked
   * to a verified global Person — so they can use telemedicine, hold record
   * shares, etc. Idempotent: returns the existing platform patient if already
   * enrolled.
   */
  selfEnrollConsumer: async (userId: string, data: { date_of_birth: string; national_id?: string; phone?: string }) => {
    if (!ValidationUtil.isValidUUID(userId)) throw new Error('Invalid user ID format');
    if (!data.date_of_birth) throw new Error('date_of_birth is required');

    const platform = await getPlatformTenant();
    if (!platform) throw new Error('Platform tenant is not available');

    const user: any = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const existing = await Patient.findOne({ where: { user_id: userId, tenant_id: platform.id } });
    if (existing) {
      const person = existing.person_id ? await Person.findByPk(existing.person_id) : null;
      return { patient: existing, person, already_enrolled: true };
    }

    // Resolve/create a verified Person (email-verified via signup; NIN if given).
    const nationalId = data.national_id?.trim();
    let person: Person | null = null;
    if (nationalId) {
      person = await Person.findOne({ where: { national_id: nationalId, status: { [Op.ne]: PersonStatus.MERGED } } });
    }
    if (!person && user.email) {
      person = await Person.findOne({ where: { verified_email: user.email, status: { [Op.ne]: PersonStatus.MERGED } } });
    }
    if (!person) {
      person = await Person.create({
        national_id: nationalId || null,
        verified_email: user.email || null,
        first_name: user.first_name,
        last_name: user.last_name,
        date_of_birth: data.date_of_birth,
        status: PersonStatus.VERIFIED
      } as any);
    }

    const patient = await Patient.create({
      first_name: user.first_name,
      last_name: user.last_name,
      date_of_birth: data.date_of_birth,
      email: user.email || null,
      phone: data.phone || user.phone || null,
      user_id: userId,
      person_id: person.id,
      tenant_id: platform.id
    } as any);

    return { patient, person, already_enrolled: false };
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
