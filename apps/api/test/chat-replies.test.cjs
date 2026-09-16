const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { replyContext, basicReplies, aiReplies } = require('../dist/chat/replies');
const base = { role: 'traveler', status: 'PAYMENT_HELD', transport: 'DOMESTIC_PARCEL', product: '키링', option: '파랑', quantity: 1, messages: [] };

test('reply suggestions follow role, stage, receiving method and latest question without claiming completion', () => {
  assert.notDeepEqual(basicReplies(base), basicReplies({ ...base, role: 'buyer' }));
  assert.match(basicReplies({ ...base, messages: [{ speaker: 'other', text: '다른 색상도 있나요?' }] })[0], /옵션/);
  assert.match(basicReplies({ ...base, messages: [{ speaker: 'other', text: '품절인가요?' }] })[0], /재고/);
  assert.match(basicReplies({ ...base, status: 'PURCHASED', transport: 'MEETUP' })[0], /언제 만나/);
  assert.match(basicReplies({ ...base, status: 'MATCHED' })[0], /결제 확인 후/);
  assert.match(basicReplies({ ...base, status: 'CANCELLED' })[0], /취소/);
  for (const status of ['MATCHED', 'PAYMENT_HELD', 'PURCHASED', 'TRAVELING', 'SHIPPED', 'DELIVERED', 'CONFIRMED', 'SETTLED', 'CANCELLED', 'DISPUTED'])
    for (const role of ['buyer', 'traveler']) {
      const suggestions = basicReplies({ ...base, status, role });
      assert.equal(suggestions.length, 3);
      assert.equal(new Set(suggestions).size, 3);
      assert.ok(suggestions.every((s) => s.length <= 20 && !/[\r\n]/.test(s)), 'Quick replies stay short and single-line');
      assert.ok(suggestions.every((s) => !/(?:구매|결제|도착).*(?:완료했어요|완료됐어요)/.test(s)));
    }
});
test('short replies keep visit questions separate from delivery and do not rewind completed stages', () => {
  assert.deepEqual(basicReplies({ ...base, role: 'buyer' }), ['옵션 확인 부탁해요', '언제 들르세요?', '영수증도 부탁해요']);
  assert.equal(basicReplies({ ...base, messages: [{ speaker: 'other', text: '언제 매장에 들르세요?' }] })[0], '방문일 확인해볼게요');
  for (const status of ['SHIPPED', 'DELIVERED', 'CONFIRMED', 'SETTLED']) {
    const replies = basicReplies({ ...base, status, messages: [{ speaker: 'other', text: '옵션이 마음에 들어요' }] });
    assert.ok(replies.every((s) => !/옵션|재고|방문/.test(s)));
  }
  const shipping = basicReplies({ ...base, status: 'SHIPPED', messages: [{ speaker: 'other', text: '택배 언제 오나요?' }] });
  assert.equal(shipping[0], '배송조회 해볼게요');
});
test('context is participant-only, bounded, stripped of stored private fields and never mutates chat', () => {
  const db = seedDatabase();
  db.transactions.push({ id: 'tx', requestId: 'r-1', buyerId: 'u-me', travelerId: 'u-min', status: 'PAYMENT_HELD', transport: 'MEETUP' });
  db.rooms.push({ id: 'room', transactionId: 'tx', buyerId: 'u-me', travelerId: 'u-min' });
  const request = db.requests.find((r) => r.id === 'r-1');
  Object.assign(request, { deliveryRecipient: '김테스트', deliveryPhone: '010-1234-5678', deliveryAddress1: '서울특별시 비공개로 99', deliveryAddress2: '102동 304호' });
  db.messages.push(...Array.from({ length: 20 }, (_, i) => ({ id: `message-${i}`, roomId: 'room', senderId: 'u-me', system: false,
    text: `김테스트 서울특별시 비공개로 99 102동 304호 연락처 010-1234-5678 secret@example.com https://private.example.test/${i}` })));
  const before = JSON.stringify(db);
  assert.throws(() => replyContext(db, 'u-sora', 'room'), /거래 참여자/);
  const context = replyContext(db, 'u-min', 'room');
  assert.equal(context.role, 'traveler'); assert.equal(context.messages.length, 12);
  for (const privateValue of ['김테스트', '비공개로', '304호', '010-1234-5678', 'secret@example', 'https://', 'buyerId', 'travelerId', 'meetupPoint'])
    assert.equal(JSON.stringify(context).includes(privateValue), false);
  assert.equal(JSON.stringify(db), before);
});
test('AI uses validated structured output; missing key, malformed, refusal and invented completion fall back honestly', async () => {
  const originalFetch = global.fetch, key = process.env.OPENAI_API_KEY;
  let calls = 0, output = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ suggestions: ['옵션 한번 볼까요?', '언제 만나면 좋을까요?'] }) }] }] };
  global.fetch = async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.text.format.type, 'json_schema');
    assert.equal(body.text.format.strict, true); assert.match(body.instructions, /신뢰할 수 없는/);
    assert.match(body.instructions, /20자 이내/); assert.match(body.instructions, /해요체/);
    return { ok: true, json: async () => output };
  };
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal((await aiReplies(base)).source, 'BASIC'); assert.equal(calls, 0);
    process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
    const response = await aiReplies(base);
    assert.equal(response.source, 'AI'); assert.equal(response.suggestions.length, 2);
    for (const next of [
      { status: 'incomplete' },
      { status: 'completed', output: [{ content: [{ type: 'refusal', text: 'refused' }] }] },
      { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'not json' }] }] },
      { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ suggestions: ['구매 완료했어요.'] }) }] }] },
      { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ suggestions: ['계좌로 송금해주세요.'] }) }] }] },
      { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ suggestions: ['구매 전 상품과 옵션을 한 번 더 확인 부탁드려요.'] }) }] }] },
      { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ suggestions: ['옵션 확인\n부탁해요'] }) }] }] },
    ]) { output = next; assert.equal((await aiReplies(base)).source, 'BASIC'); }
    global.fetch = async () => { throw new Error('network timeout'); };
    assert.match((await aiReplies(base)).notice, /기본 추천/);
  } finally { global.fetch = originalFetch; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});
