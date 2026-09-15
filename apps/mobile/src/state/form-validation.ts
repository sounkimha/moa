export const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const validProductUrl = (value: string) => {
  if (!value.trim()) return true;
  if (value.trim().length > 2048) return false;
  try { const url = new URL(value.trim()); return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; }
  catch { return false; }
};

export const validLocalPrice = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value)
  && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 20_000_000;

export function productValidation(input: { name: string; price: string; url: string; hasPlace: boolean; quantity: number; storeName: string; option: string }) {
  if (input.name.trim().length < 2 || input.name.trim().length > 100) return '상품명은 2자부터 100자까지 입력해주세요.';
  if (!validLocalPrice(input.price)) return '현지 가격을 확인해주세요. 0보다 크고 2천만 이하인 금액을 입력할 수 있어요.';
  if (!validProductUrl(input.url)) return '올바른 상품 링크를 입력해주세요. http:// 또는 https:// 주소가 필요해요.';
  if (!input.hasPlace) return '어디에서 살 수 있는지 구매 장소를 선택해주세요.';
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) return '수량은 1개부터 10개까지 선택해주세요.';
  if (input.storeName.trim().length > 120) return '매장 이름은 120자 안으로 입력해주세요.';
  if (input.option.trim().length > 150) return '상품 옵션은 150자 안으로 입력해주세요.';
  return '';
}

export function addressValidation(input: { recipient: string; phone: string; postalCode: string; address1: string; address2: string }) {
  for (const [value, label, max] of [
    [input.recipient, '받는 분', 50], [input.phone, '연락처', 30], [input.postalCode, '우편번호', 12], [input.address1, '주소', 160],
  ] as const) {
    if (!value.trim()) return `${label}을 입력해주세요.`;
    if (value.trim().length > max) return `${label}은 ${max}자 안으로 입력해주세요.`;
  }
  return input.address2.trim().length > 160 ? '상세 주소는 160자 안으로 입력해주세요.' : '';
}
