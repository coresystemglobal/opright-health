import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import sequelize from '../src/core/database';
import '../src/models';

function loadEnvUrl(): string {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const m = env.match(/DATABASE_URL=(\S+)/);
  if (!m) throw new Error('DATABASE_URL not found in .env');
  return m[1].replace(/\$/g, '');
}

async function run(): Promise<void> {
  await sequelize.authenticate();
  const pg = new Client({ connectionString: loadEnvUrl(), ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const tablesRes = await pg.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`
  );
  const tableNames = new Set(tablesRes.rows.map((r) => r.table_name));
  let missing: Array<{ table: string; column: string }> = [];
  for (const model of Object.values(sequelize.models as any)) {
    const tableName = String(model.getTableName());
    if (!tableNames.has(tableName)) continue;
    const colsRes = await pg.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [tableName]);
    const existing = new Set(colsRes.rows.map((r) => r.column_name));
    const attrs = model.rawAttributes as Record<string, any>;
    for (const [name, attr] of Object.entries(attrs)) {
      const field = attr.field || name;
      if (!existing.has(field) && !attr.primaryKey) {
        missing.push({ table: tableName, column: field });
      }
    }
  }
  if (missing.length === 0) {
    console.log('NO MISSING rawAttribute COLUMNS');
  } else {
    for (const m of missing) console.log(`  MISSING ${m.table}.${m.column}`);
  }
  await pg.end();
  await sequelize.close();
}
run().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
