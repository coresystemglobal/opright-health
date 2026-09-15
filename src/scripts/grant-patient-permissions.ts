/**
 * Grants the `patient` role the permissions its self-service surface (the
 * HealthBridge patient web client) needs, expressed in the policy's
 * `resource:action` vocabulary (src/security/policy.ts).
 *
 *   ts-node -r tsconfig-paths/register src/scripts/grant-patient-permissions.ts
 *
 * The historical RBAC seed granted the patient role only `access:view`,
 * `patients:read`, `appointments:read` — names that predate the colon-style
 * policy vocabulary, so the gate (which reads `${resource}:${action}` off the
 * role's permissions) denied every patient-facing route. This script reconciles
 * that gap. It is idempotent: permissions and grants are created only if
 * missing, so it is safe to re-run.
 *
 * Scope note: these are tenant-scoped view/create rights. For a patient's OWN
 * records the client is expected to call the patient-scoped routes
 * (/appointments/patient/:id, /medications/patient/:id) rather than the
 * list-all endpoints, so `appointment:view` / `medication:view` here do not by
 * themselves widen a patient's view to the whole tenant.
 */
import sequelize from '../core/database';
import { Role, Permission, RolePermission } from '../models';
import { invalidateRoleMembers } from '../security/permissions';

// resource:action pairs the patient web client depends on.
const REQUIRED: Array<{ resource: string; action: string; description: string }> = [
  { resource: 'hospital', action: 'view', description: 'Browse hospitals' },
  { resource: 'doctor', action: 'view', description: 'Browse doctors' },
  { resource: 'appointment', action: 'view', description: 'View appointments' },
  { resource: 'appointment', action: 'create', description: 'Book appointments' },
  { resource: 'appointment', action: 'update', description: 'Reschedule / cancel appointments' },
  { resource: 'medication', action: 'view', description: 'View medications' },
  { resource: 'medication', action: 'create', description: 'Add medication reminders' },
  { resource: 'medication', action: 'update', description: 'Update medication reminders' },
  { resource: 'medication', action: 'delete', description: 'Remove medication reminders' },
  { resource: 'family', action: 'view', description: 'View family members' },
  { resource: 'family', action: 'create', description: 'Add family members' },
  { resource: 'family', action: 'update', description: 'Update family members' },
  { resource: 'family', action: 'delete', description: 'Remove family members' },
  { resource: 'patient', action: 'view', description: 'View own patient record' },
  { resource: 'patient', action: 'update', description: 'Update own patient record' },
  { resource: 'payment', action: 'view', description: 'View own payments' },
  { resource: 'payment', action: 'create', description: 'Initiate payments' },
  { resource: 'review', action: 'view', description: 'View doctor reviews' },
  { resource: 'review', action: 'create', description: 'Leave doctor reviews' },
  { resource: 'review', action: 'delete', description: 'Delete own reviews' },
  { resource: 'triage', action: 'view', description: 'View triage results' },
  { resource: 'triage', action: 'create', description: 'Run symptom triage' },
  { resource: 'lab', action: 'view', description: 'View own lab test orders and results' },
  { resource: 'visitor', action: 'view', description: 'Look up visitor logs' },
  { resource: 'visitor', action: 'create', description: 'Check visitors in/out' },
  { resource: 'queue', action: 'view', description: 'View visitor queue' },
];

async function run() {
  await sequelize.authenticate();
  console.log('Database connected.');

  const patientRole = await Role.findOne({ where: { role: 'patient' } });
  if (!patientRole) {
    throw new Error('patient role not found — run the RBAC seeder first.');
  }

  let createdPerms = 0;
  let createdGrants = 0;

  for (const { resource, action, description } of REQUIRED) {
    const name = `${resource}:${action}`;

    const [perm, permCreated] = await Permission.findOrCreate({
      where: { name },
      defaults: { name, resource, action, description },
    });
    if (permCreated) createdPerms++;

    const [, grantCreated] = await RolePermission.findOrCreate({
      where: { role_id: (patientRole as any).id, permission_id: (perm as any).id },
      defaults: { role_id: (patientRole as any).id, permission_id: (perm as any).id },
    });
    if (grantCreated) createdGrants++;
  }

  // Drop cached principals so the new grants take effect immediately rather
  // than after the 5-minute RBAC cache TTL.
  await invalidateRoleMembers((patientRole as any).id);

  console.log(
    `Done. ${REQUIRED.length} permissions ensured ` +
      `(${createdPerms} newly created), ${createdGrants} new grant(s) to the patient role. ` +
      `Cache invalidated.`
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('grant-patient-permissions failed:', err);
    process.exit(1);
  });
