const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { canAcceptTrip } = require('@moa/domain');
const { parseBoardingPass, readBoardingImage } = require('../dist/trips/boarding-pass');
const { compareTickets, readTicket } = require('../dist/trips/flight-proof');
const { Store } = require('../dist/infrastructure/store');
const writer = require('zxing-wasm/writer');
const wasm = fs.readFileSync(require.resolve('zxing-wasm/writer/zxing_writer.wasm'));
writer.prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) } });
const future = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const julian = (date) => String(Math.round((Date.parse(date) - Date.parse(date.slice(0, 4) + '-01-01')) / 86400000) + 1).padStart(3, '0');
function bcbp(from = 'ICN', to = 'NRT', date = future(4), passenger = 'SAMPLE/TRAVELER') {
  return 'M1' + passenger.padEnd(20) + 'E' + 'PNRDEMO' + from + to + 'KE ' + '00701' + julian(date) + 'Y' + '001A' + '00001' + '1' + '00';
}
async function barcode(text, format = 'QRCode') {
  const result = await writer.writeBarcode(text, { format, scale: 4 });
  assert.equal(result.error, '');
  return 'data:image/png;base64,' + Buffer.from(await result.image.arrayBuffer()).toString('base64');
}

test('real image decoder reads QR, PDF417, Aztec and Data Matrix; URLs and broken boarding codes are not tickets', async () => {
  const data = bcbp();
  for (const format of ['QRCode', 'PDF417', 'Aztec', 'DataMatrix']) {
    const read = await readBoardingImage(await barcode(data, format));
    assert.equal(read.source, 'BARCODE', format);
    assert.deepEqual(read.legs[0], { from: 'ICN', to: 'NRT', flightNumber: 'KE701', date: null, dayOfYear: Number(julian(future(4))) });
    assert.equal(read.legs[0].pnr, undefined);
  }
  assert.equal(await readBoardingImage(await barcode('https://example.com/booking/private')), null);
  assert.equal(parseBoardingPass(data.slice(0, 58)), null);
  assert.equal(parseBoardingPass(data.slice(0, 44) + '999' + data.slice(47)), null);
});

test('round trip comparison catches wrong directions, dates, different passengers and supports a combined itinerary', () => {
  const trip = { ...seedDatabase().trips[0], startDate: future(4), endDate: future(8), departureCountry: 'KR', destinationCountry: 'JP' };
  const out = parseBoardingPass(bcbp()), back = parseBoardingPass(bcbp('NRT', 'ICN', future(8)));
  const proof = compareTickets(trip, out, back);
  assert.equal(proof.itineraryMatches, true);
  assert.ok(proof.issues.some((issue) => issue.includes('연도')));
  assert.ok(proof.issues.some((issue) => issue.includes('본인')));
  assert.equal(JSON.stringify(proof).includes('SAMPLE/TRAVELER'), false);
  assert.equal(JSON.stringify(proof).includes('PNRDEMO'), false);
  assert.equal(compareTickets(trip, out, out).itineraryMatches, false);
  assert.equal(compareTickets(trip, out, { ...back, passenger: 'OTHER/PERSON' }).itineraryMatches, false);
  assert.equal(compareTickets(trip, out, parseBoardingPass(bcbp('NRT', 'ICN', future(9)))).itineraryMatches, false);
  const combined = { ...out, legs: [...out.legs, ...back.legs] };
  assert.equal(compareTickets(trip, combined, combined).itineraryMatches, true);
});

test('OCR is opt-in, handles full dates, and never fetches booking QR URLs', async () => {
  const original = global.fetch, oldKey = process.env.OPENAI_API_KEY;
  const image = await barcode('https://example.com/booking/private');
  try {
    let calls = 0;
    process.env.OPENAI_API_KEY = 'flight-test-only';
    global.fetch = async (url, options) => {
      calls++; assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(options.body);
      assert.equal(body.store, false);
      return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ passenger: 'SAMPLE/TRAVELER', legs: [
        { from: 'ICN', to: 'NRT', flightNumber: 'KE701', date: future(4) },
      ] }) }] }] });
    };
    await assert.rejects(readTicket(image, false), /동의/);
    assert.equal(calls, 0);
    assert.equal((await readTicket(image, true)).legs[0].date, future(4));
    assert.equal(calls, 1);
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(readTicket(image, true), /키 설정/);
  } finally { global.fetch = original; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
});

test('API stores only private sanitized proof, requires ownership/consent, blocks unverified claim and legacy offer acceptance', async () => {
  const temp = fs.mkdtempSync(path.join(tmpdir(), 'moa-flight-test-'));
  const previousFile = process.env.DATA_FILE;
  process.env.DATA_FILE = path.join(temp, 'state.json'); process.env.PORT = '0'; process.env.QUIET = '1';
  delete process.env.DATABASE_URL;
  const { bootstrap } = require('../dist/main');
  const app = await bootstrap();
  const base = (await app.getUrl()).replace('0.0.0.0', '127.0.0.1').replace('[::1]', '127.0.0.1') + '/api';
  const tokens = {};
  const call = async (route, body, actor = 'u-min', key = randomUUID()) => {
    const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[actor] || ''}`, 'Idempotency-Key': key },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try {
    for (const userId of ['u-min', 'u-me']) tokens[userId] = (await call('/auth/demo', { userId, provider: 'DEMO' })).body.token;
    const trip = (await call('/trips', { departureCountry: 'KR', departureCity: '서울', destinationCountry: 'JP', destinationCity: '도쿄',
      startDate: future(4), endDate: future(8), placeIds: ['p-station'], maxItems: 5 })).body;
    const acceptance = { tripId: trip.id, reward: 1000, estimatedPurchaseDate: future(5), estimatedDeliveryDate: future(10), message: '가는 길에 가져올게요.', transport: 'DOMESTIC_PARCEL' };
    assert.equal((await call('/requests/r-1/claim', acceptance)).status, 409);
    assert.equal((await call('/requests/r-1/offers', acceptance)).status, 409);
    assert.equal((await call('/bundles/claim', { ...acceptance, requestIds: ['r-1'] })).status, 409);
    const upload = { outboundImage: await barcode(bcbp()), inboundImage: await barcode(bcbp('NRT', 'ICN', future(8))), consent: true, allowAI: false };
    assert.equal((await call(`/trips/${trip.id}/flight-proof`, upload, 'u-me')).status, 403);
    assert.equal((await call(`/trips/${trip.id}/flight-proof`, { ...upload, consent: false })).status, 400);
    const key = randomUUID();
    const response = await call(`/trips/${trip.id}/flight-proof`, upload, 'u-min', key);
    assert.equal(response.status, 201);
    assert.equal(response.body.verificationStatus, 'PENDING_REVIEW');
    assert.deepEqual((await call(`/trips/${trip.id}/flight-proof`, upload, 'u-min', key)).body, response.body);
    assert.equal((await call('/requests/r-1/claim', acceptance)).status, 409);
    const privateTrip = (await call('/snapshot')).body.trips.find((t) => t.id === trip.id);
    assert.ok(privateTrip.flightProof);
    assert.equal(canAcceptTrip(privateTrip), false);
    assert.equal((await call('/snapshot', undefined, 'u-me')).body.trips.find((t) => t.id === trip.id).flightProof, undefined);
    const stored = fs.readFileSync(process.env.DATA_FILE, 'utf8');
    for (const secret of ['SAMPLE/TRAVELER', 'PNRDEMO', upload.outboundImage]) assert.equal(stored.includes(secret), false);
    const oldOffer = await app.get(Store).transaction((db) => {
      const offer = db.offers.find((o) => o.travelerId === 'u-min' && o.requestId === 'r-1');
      offer.tripId = trip.id;
      return offer;
    });
    const snapshot = (await call('/snapshot', undefined, 'u-me')).body;
    const revision = snapshot.requests.find((r) => r.id === 'r-1').revision;
    assert.equal((await call(`/offers/${oldOffer.id}/accept`, { expectedRevision: revision }, 'u-me')).status, 409);
  } finally {
    await app.close(); fs.rmSync(temp, { recursive: true, force: true });
    if (previousFile === undefined) delete process.env.DATA_FILE; else process.env.DATA_FILE = previousFile;
  }
});
