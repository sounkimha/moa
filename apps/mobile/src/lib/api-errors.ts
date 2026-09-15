/** Keep actionable Korean validation copy, without exposing server diagnostics. */
export function apiErrorMessage(message: unknown, status: number): string {
  const fallback = status === 401 ? '로그인이 필요해요. 다시 로그인해주세요.'
    : status === 403 ? '이 작업을 할 수 없어요. 이용 중인 계정을 확인해주세요.'
    : status === 404 ? '이 내용을 찾을 수 없어요. 이전 화면에서 다시 확인해주세요.'
    : status === 409 ? '진행 상태가 바뀌었어요. 새로고침한 뒤 다시 확인해주세요.'
    : status === 429 ? '요청이 잠시 몰렸어요. 조금 뒤에 다시 시도해주세요.'
    : status >= 500 ? '일시적으로 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
    : '입력한 내용을 확인한 뒤 다시 시도해주세요.';
  const entries = Array.isArray(message) ? message : [message];
  const diagnostics = /Cannot\s+(?:GET|POST|PUT|PATCH|DELETE)|<\/?(?:html|body|script)|https?:\/\/|\/(?:api|Users|node_modules|var|home)\/|\b(?:TypeError|ReferenceError|SyntaxError|ECONN\w*|ENOTFOUND|ETIMEDOUT|SQLSTATE|Prisma\w*|Internal Server Error|Bad Gateway|Service Unavailable)\b|\bat\s+\S+\s*\([^)]*:\d+:\d+\)/i;
  const lines = entries.filter((entry): entry is string => typeof entry === 'string')
    .flatMap((entry) => entry.split('\n'))
    .map((line) => line.replace(/^\s*[a-zA-Z_][\w.[\]-]*:\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length <= 250 && /[가-힣]/.test(line) && !diagnostics.test(line));
  return [...new Set(lines)].slice(0, 3).join('\n') || fallback;
}
