/**
 * Seeds the triage question bank and rules (idempotent — skips if already
 * present). Without these rows the triage flow starts a session but returns no
 * first question.
 *
 *   ts-node -r tsconfig-paths/register src/scripts/seed-triage.ts
 */
import sequelize from '../core/database';
import { seedTriageData } from '../seeders/triage.seeder';

async function run() {
  await sequelize.authenticate();
  console.log('Database connected.');
  await seedTriageData();
  console.log('Triage seeding complete.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seed-triage failed:', err);
    process.exit(1);
  });
