/**
 * One-off backfill: encrypt existing plaintext values in the columns that are
 * now encrypted at rest. Idempotent — rows already in ciphertext are skipped,
 * so it is safe to run more than once. Run AFTER migration 052.
 *
 *   ts-node -r tsconfig-paths/register src/scripts/encrypt-existing-pii.ts
 */
import sequelize from '@core/database';
import { QueryTypes } from 'sequelize';
import { EncryptionUtil } from '@utils/encryption.util';

const TARGETS: Array<{ table: string; columns: string[] }> = [
  { table: 'patients', columns: ['phone', 'address', 'emergency_contact_name', 'emergency_contact_phone'] },
  { table: 'appointments', columns: ['diagnosis', 'treatment_plan', 'prescription'] },
  { table: 'clinical_notes', columns: ['chief_complaint', 'content', 'diagnosis', 'treatment_plan', 'prescriptions', 'follow_up_instructions'] }
];

async function backfill() {
  await sequelize.authenticate();
  let encrypted = 0, skipped = 0;

  for (const { table, columns } of TARGETS) {
    for (const col of columns) {
      const rows = await sequelize.query<{ id: string; val: string | null }>(
        `SELECT id, "${col}" AS val FROM "${table}" WHERE "${col}" IS NOT NULL`,
        { type: QueryTypes.SELECT }
      );
      for (const row of rows) {
        if (row.val == null || row.val === '' || EncryptionUtil.isEncrypted(row.val)) { skipped++; continue; }
        const cipher = EncryptionUtil.encrypt(row.val);
        await sequelize.query(
          `UPDATE "${table}" SET "${col}" = :cipher WHERE id = :id`,
          { replacements: { cipher, id: row.id }, type: QueryTypes.UPDATE }
        );
        encrypted++;
      }
      console.log(`${table}.${col}: ${rows.length} row(s) scanned`);
    }
  }

  console.log(`\nDone. Encrypted ${encrypted} value(s), skipped ${skipped} (already encrypted/empty).`);
  await sequelize.close();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
