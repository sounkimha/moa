export const COUNTRY_CODES = ['JP', 'KR', 'TW', 'HK', 'CN', 'TH', 'VN', 'SG', 'MY', 'ID'] as const;
export type Country = typeof COUNTRY_CODES[number];
export const CURRENCY_CODES = ['JPY', 'KRW', 'TWD', 'HKD', 'CNY', 'THB', 'VND', 'SGD', 'MYR', 'IDR'] as const;
export type Currency = typeof CURRENCY_CODES[number];

export const DESTINATIONS: Record<Country, { name: string; currency: Currency; cities: string[] }> = {
  JP: { name: '일본', currency: 'JPY', cities: ['도쿄', '오사카', '후쿠오카', '삿포로'] },
  KR: { name: '한국', currency: 'KRW', cities: ['서울', '제주'] },
  TW: { name: '대만', currency: 'TWD', cities: ['타이베이', '가오슝'] },
  HK: { name: '홍콩', currency: 'HKD', cities: ['홍콩'] },
  CN: { name: '중국', currency: 'CNY', cities: ['상하이', '베이징'] },
  TH: { name: '태국', currency: 'THB', cities: ['방콕', '치앙마이'] },
  VN: { name: '베트남', currency: 'VND', cities: ['다낭', '하노이', '호찌민'] },
  SG: { name: '싱가포르', currency: 'SGD', cities: ['싱가포르'] },
  MY: { name: '말레이시아', currency: 'MYR', cities: ['쿠알라룸푸르'] },
  ID: { name: '인도네시아', currency: 'IDR', cities: ['발리', '자카르타'] },
};
// Fixed examples for this prototype, not live rates or executable FX quotes.
export const DEMO_FX_RATES: Record<Currency, number> = {
  JPY: 9.4, KRW: 1, TWD: 44, HKD: 170, CNY: 190,
  THB: 40, VND: 0.055, SGD: 1000, MYR: 300, IDR: 0.085,
};
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  JPY: '¥', KRW: '₩', TWD: 'NT$', HKD: 'HK$', CNY: 'CN¥',
  THB: '฿', VND: '₫', SGD: 'S$', MYR: 'RM', IDR: 'Rp',
};
export const countryName = (country: Country) => DESTINATIONS[country].name;
export const currencyForCountry = (country: Country): Currency => DESTINATIONS[country].currency;
