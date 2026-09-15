const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
const source = readFileSync(join(__dirname, '../../mobile/src/lib/api-errors.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const mod = { exports: {} };
new Function('exports', 'module', outputText)(mod.exports, mod);
const { apiErrorMessage } = mod.exports;

test('server diagnostics never appear in mobile error copy', () => {
  for (const message of ['Cannot POST /api/recognize', 'Internal Server Error', '<html>502 Bad Gateway</html>', '서버 오류: ECONNREFUSED 127.0.0.1:4000', '실패: https://private.example/token', '오류: /Users/dev/server.ts:10', { stack: 'TypeError' }]) {
    const result = apiErrorMessage(message, 500);
    assert.equal(result, '일시적으로 처리하지 못했어요. 잠시 후 다시 시도해주세요.');
  }
});

test('Korean validation stays actionable without internal field identifiers', () => {
  assert.equal(apiErrorMessage(['deliveryRecipient: 받는 분을 입력해주세요.', 'requestedReward: 보상은 원 단위로 입력해주세요.'], 400), '받는 분을 입력해주세요.\n보상은 원 단위로 입력해주세요.');
  assert.equal(apiErrorMessage(['Expected number, received string', '재고를 다시 확인해주세요.'], 400), '재고를 다시 확인해주세요.');
  assert.equal(apiErrorMessage('항공권 QR을 다시 촬영해주세요.', 400), '항공권 QR을 다시 촬영해주세요.');
});

test('missing error payload gets a recovery action appropriate to its status', () => {
  assert.match(apiErrorMessage(undefined, 401), /로그인/);
  assert.match(apiErrorMessage('Not Found', 404), /이전 화면/);
  assert.match(apiErrorMessage({}, 409), /새로고침/);
  assert.match(apiErrorMessage(null, 429), /조금 뒤/);
});
