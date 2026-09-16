import dotenv from 'dotenv';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
dotenv.config({ path: 'apps/api/.env' });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL in apps/api/.env before migrating.');
const pool = new pg.Pool({ connectionString });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(71290614)');
  await client.query('CREATE SCHEMA IF NOT EXISTS moa');
  await client.query(
    'CREATE TABLE IF NOT EXISTS moa.schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  for (const [version, file] of [[1, '001_initial.sql'], [2, '002_asia_currency.sql'], [3, '003_auth_wallet.sql'], [4, '004_request_prepayment.sql']]) {
    const applied = await client.query('SELECT version FROM moa.schema_migrations WHERE version=$1', [version]);
    if (!applied.rowCount) {
      await client.query(await readFile(`database/${file}`, 'utf8'));
      await client.query('INSERT INTO moa.schema_migrations(version) VALUES($1)', [version]);
    }
  }
  await client.query('COMMIT');
  console.log('Schema is at version 4. Existing payloads are preserved.');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
  await pool.end();
}
