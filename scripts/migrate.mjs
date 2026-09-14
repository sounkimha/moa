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
  const applied = await client.query('SELECT version FROM moa.schema_migrations WHERE version=1');
  if (!applied.rowCount) {
    await client.query(await readFile('database/001_initial.sql', 'utf8'));
    await client.query('INSERT INTO moa.schema_migrations(version) VALUES(1)');
  }
  await client.query('COMMIT');
  console.log(
    applied.rowCount
      ? 'Schema already at version 1.'
      : 'Applied schema version 1. Seed data is inserted on the first authenticated request.',
  );
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
  await pool.end();
}
