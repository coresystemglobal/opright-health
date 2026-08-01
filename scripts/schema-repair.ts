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

const TYPE_MAP: Record<string, string> = {
  STRING: 'varchar(255)',
  CHAR: 'char(255)',
  TEXT: 'text',
  UUID: 'uuid',
  INTEGER: 'integer',
  BIGINT: 'bigint',
  SMALLINT: 'smallint',
  FLOAT: 'double precision',
  DOUBLE: 'double precision',
  REAL: 'real',
  DECIMAL: 'numeric',
  BOOLEAN: 'boolean',
  DATE: 'timestamptz',
  DATEONLY: 'date',
  TIME: 'time',
  JSON: 'jsonb',
  JSONB: 'jsonb',
  ENUM: 'varchar(255)',
  BLOB: 'bytea',
};

function pgType(attr: any): string | null {
  const key = attr.type?.key;
  if (!key) return null;
  if (key === 'VIRTUAL') return null;
  if (key === 'STRING' || key === 'CHAR' || key === 'ENUM') {
    const len = attr.type?.options?.length;
    if (key === 'ENUM') return 'varchar(255)';
    return len ? `${key === 'STRING' ? 'varchar' : 'char'}(${len})` : 'varchar(255)';
  }
  return TYPE_MAP[key] || 'text';
}

async function run(): Promise<void> {
  await sequelize.authenticate();
  console.log('DB connected.');

  const pg = new Client({ connectionString: loadEnvUrl(), ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const tablesRes = await pg.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
  );
  const tableNames = new Set(tablesRes.rows.map((r) => r.table_name));

  const toRun: string[] = [];
  const skippedTables: string[] = [];
  for (const model of Object.values(sequelize.models as any)) {
    const tableName = String(model.getTableName());
    if (!tableNames.has(tableName)) {
      skippedTables.push(tableName);
      continue;
    }
    const colsRes = await pg.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName],
    );
    const existing = new Set(colsRes.rows.map((r) => r.column_name));

    const attrs = model.tableAttributes as Record<string, any>;
    for (const [name, attr] of Object.entries(attrs)) {
      const field = attr.field || name;
      if (existing.has(field)) continue;
      if (attr.primaryKey) continue;
      const type = pgType(attr);
      if (!type) continue;
      toRun.push(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${field}" ${type}`);
    }
  }

  console.log(`Models without a table (skipped): ${skippedTables.length}`);
  skippedTables.forEach((t) => console.log(`  [skip] ${t}`));

  if (toRun.length === 0) {
    console.log('No missing columns found.');
  } else {
    console.log(`Executing ${toRun.length} ALTER statements...`);
    for (const sql of toRun) {
      try {
        await pg.query(sql);
        console.log(`  ok  ${sql}`);
      } catch (e: any) {
        console.log(`  ERR ${sql}\n       ${e.message}`);
      }
    }
  }
  await pg.end();
  await sequelize.close();
  console.log('Done.');
}

run().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
