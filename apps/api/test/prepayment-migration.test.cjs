const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, readFile, readdir, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { Store } = require('../dist/infrastructure/store');
test('old open requests become private unpaid drafts; existing unpaid matches stay unpaid, with original backup', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'moa-prepay-migration-'));
  const previous = process.env.DATA_FILE, database = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    process.env.DATA_FILE = path.join(dir, 'state.json');
    const db = seedDatabase(); delete db.requestFundings;
    db.requests[0].status = 'MATCHED';
    db.transactions.push({ id: 'old-match', requestId: db.requests[0].id, buyerId: 'u-me', travelerId: 'u-min', status: 'MATCHED' });
    const original = JSON.stringify(db);
    await writeFile(process.env.DATA_FILE, original);
    const migrated = await new Store().read((value) => value);
    assert.equal(migrated.requestFundings.length, 0);
    assert.equal(migrated.transactions[0].status, 'MATCHED');
    assert.equal(migrated.requests[0].status, 'MATCHED');
    assert.ok(migrated.requests.slice(1).every((request) => request.status === 'PAYMENT_PENDING'));
    const backup = (await readdir(dir)).find((name) => name.endsWith('.bak'));
    assert.equal(await readFile(path.join(dir, backup), 'utf8'), original);
    assert.deepEqual(await new Store().read((value) => value), migrated);
  } finally {
    if (previous === undefined) delete process.env.DATA_FILE; else process.env.DATA_FILE = previous;
    if (database === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = database;
    await rm(dir, { recursive: true, force: true });
  }
});
