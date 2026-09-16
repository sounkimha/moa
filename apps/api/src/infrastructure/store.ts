import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Pool, PoolClient } from 'pg';
import { Database } from '@moa/domain';
import { seedDatabase } from '@moa/domain/dist/seed';
import { migrateLegacyDelivery } from './delivery-migration';

function migratePrepayment(db: Database) {
  let changed = false;
  for (const request of db.requests) {
    if (!['REQUESTED', 'OFFER_RECEIVED'].includes(request.status) ||
        db.requestFundings.some((funding) => funding.requestId === request.id && funding.status === 'HELD')) continue;
    // Never invent a payment for saved requests from the old accept-then-pay flow.
    request.status = 'PAYMENT_PENDING';
    request.revision++;
    changed = true;
  }
  return changed;
}

function addMissingDestinationPlaces(db: Database) {
  const defaults = seedDatabase();
  const missing = defaults.places.filter((p) => !db.places.some((saved) => saved.id === p.id));
  if (!missing.length) return false;
  db.places.push(...missing);
  db.stores.push(...defaults.stores.filter((s) => missing.some((p) => p.id === s.placeId) && !db.stores.some((saved) => saved.id === s.id)));
  return true;
}
function hydrateTrustAndFinance(db: Database) {
  const defaults = seedDatabase();
  let changed = false;
  for (const key of ['authIdentities', 'paymentMethods', 'wallets', 'walletTransactions', 'payoutAccounts'] as const) {
    for (const row of defaults[key])
      if (!db[key].some((saved) => saved.id === row.id)) {
        db[key].push(row as never);
        changed = true;
      }
  }
  for (const account of db.payoutAccounts) {
    if (account.bankName !== '모아은행 · 데모') continue;
    account.bankName = 'MOA 데모은행';
    changed = true;
  }
  for (const destination of db.destinations) {
    if (typeof destination.sequence === 'number' && destination.visitTime) continue;
    const trip = db.trips.find((item) => item.id === destination.tripId);
    const sequence = Math.max(0, trip?.placeIds.indexOf(destination.placeId) ?? 0);
    destination.sequence = sequence;
    destination.visitTime = String(11 + sequence * 2).padStart(2, '0') + ':00';
    changed = true;
  }
  return changed;
}

export const TABLES: (keyof Database)[] = [
  'users',
  'authIdentities',
  'addresses',
  'places',
  'stores',
  'products',
  'trips',
  'destinations',
  'requests',
  'offers',
  'bundles',
  'transactions',
  'verifications',
  'paymentMethods',
  'payments',
  'requestFundings',
  'escrows',
  'receipts',
  'shipments',
  'rooms',
  'messages',
  'reviews',
  'notifications',
  'payouts',
  'wallets',
  'walletTransactions',
  'payoutAccounts',
  'withdrawals',
  'disputes',
  'favorites',
  'searches',
  'events',
  'commands',
];
/** Unit of work: copy on write locally, SQL transaction + advisory lock in PostgreSQL.
 * Small-data prototype repository. Replace collection loading with indexed queries as traffic grows. */
@Injectable()
export class Store implements OnModuleDestroy {
  private db?: Database;
  private tail: Promise<unknown> = Promise.resolve();
  private pool?: Pool;
  readonly filename = process.env.DATA_FILE || path.resolve(process.cwd(), '.data/moa.json');
  constructor() {
    if (process.env.DATABASE_URL)
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  async onModuleDestroy() {
    await this.pool?.end();
  }
  private async loadFile() {
    if (!this.db) {
      try {
        this.db = JSON.parse(await fs.readFile(this.filename, 'utf8'));
        const defaults = seedDatabase();
        let shapeChanged = false;
        for (const key of TABLES)
          if (!Array.isArray(this.db![key])) {
            (this.db![key] as unknown[]) = key === 'requestFundings' ? [] : defaults[key];
            shapeChanged = true;
          }
        const draft = structuredClone(this.db!);
        const deliveryChanged = migrateLegacyDelivery(draft);
        const destinationsChanged = addMissingDestinationPlaces(draft);
        const trustChanged = hydrateTrustAndFinance(draft);
        const fundingChanged = migratePrepayment(draft);
        if (shapeChanged || deliveryChanged || destinationsChanged || trustChanged || fundingChanged) {
          // Keep the exact original bytes before the one-time compatibility migration.
          await fs.copyFile(this.filename, `${this.filename}.before-${deliveryChanged ? 'domestic-delivery' : destinationsChanged ? 'asia-destinations' : 'trust-wallet'}-${Date.now()}.bak`);
          const tmp = `${this.filename}.${process.pid}.tmp`;
          await fs.writeFile(tmp, JSON.stringify(draft, null, 2), { mode: 0o600 });
          await fs.rename(tmp, this.filename);
          this.db = draft;
        }
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        this.db = seedDatabase();
      }
    }
    return this.db!;
  }
  private async loadPg(client: PoolClient) {
    const db = {} as Database;
    for (const key of TABLES) {
      const result = await client.query(`SELECT payload FROM moa.${key}`);
      (db[key] as unknown[]) = result.rows.map((r) => r.payload);
    }
    return db;
  }
  private async writePg(client: PoolClient, before: Database, after: Database) {
    for (const key of TABLES) {
      const previous = new Map(before[key].map((row) => [row.id, JSON.stringify(row)]));
      for (const row of after[key]) {
        const body = JSON.stringify(row);
        if (body !== previous.get(row.id))
          await client.query(
            `INSERT INTO moa.${key}(id,payload) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload`,
            [row.id, body],
          );
        previous.delete(row.id);
      }
      for (const id of previous.keys())
        await client.query(`DELETE FROM moa.${key} WHERE id=$1`, [id]);
    }
  }
  async read<T>(fn: (db: Database) => T): Promise<T> {
    if (this.pool) return this.transaction(fn);
    await this.tail;
    // `read` callers must not be able to mutate the in-memory file-store state.
    // Unlike transaction(), the previous implementation passed the live object to
    // the callback, so an accidental write survived for the lifetime of the API.
    return structuredClone(fn(structuredClone(await this.loadFile())));
  }
  async resetDemo() {
    if (this.pool) throw new Error('공유 데이터베이스에서는 체험 데이터를 초기화할 수 없어요.');
    const job = this.tail.then(async () => {
      const draft = seedDatabase();
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const tmp = `${this.filename}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(draft, null, 2), { mode: 0o600 });
      await fs.rename(tmp, this.filename);
      this.db = draft;
    });
    this.tail = job.catch(() => undefined);
    await job;
  }
  async transaction<T>(fn: (db: Database) => T): Promise<T> {
    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(71290614)');
        await client.query('SET CONSTRAINTS ALL DEFERRED');
        const before = await this.loadPg(client);
        const draft = before.users.length ? structuredClone(before) : seedDatabase();
        migrateLegacyDelivery(draft);
        addMissingDestinationPlaces(draft);
        hydrateTrustAndFinance(draft);
        migratePrepayment(draft);
        const result = fn(draft);
        await this.writePg(client, before, draft);
        await client.query('COMMIT');
        return structuredClone(result);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    const job = this.tail.then(async () => {
      const draft = structuredClone(await this.loadFile());
      const result = fn(draft);
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const tmp = `${this.filename}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(draft, null, 2), { mode: 0o600 });
      await fs.rename(tmp, this.filename);
      this.db = draft;
      return structuredClone(result);
    });
    this.tail = job.catch(() => undefined);
    return job;
  }
}
