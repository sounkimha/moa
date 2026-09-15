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

export type TripArea = {
  name: string;
  kind: '도시' | '섬' | '지역';
  stops: string[];
};

/** 여행 일정 선택용 목록. 상품 판매처 카탈로그와 분리해 섬·소도시도 선택할 수 있다. */
export const TRIP_AREAS: Record<Country, TripArea[]> = {
  JP: [
    { name: '도쿄', kind: '도시', stops: ['시부야', '신주쿠', '도쿄역', '긴자'] },
    { name: '오사카', kind: '도시', stops: ['난바', '우메다', '신사이바시', '유니버설시티'] },
    { name: '후쿠오카', kind: '도시', stops: ['하카타', '텐진', '모모치'] },
    { name: '삿포로', kind: '도시', stops: ['삿포로역', '오도리', '스스키노'] },
    { name: '교토', kind: '도시', stops: ['교토역', '가와라마치', '기온'] },
    { name: '나고야', kind: '도시', stops: ['나고야역', '사카에', '오스'] },
    { name: '오키나와 본섬', kind: '섬', stops: ['나하 국제거리', '아메리칸 빌리지', '온나손'] },
    { name: '이시가키섬', kind: '섬', stops: ['유글레나 몰', '이시가키항', '가비라만'] },
    { name: '미야코지마', kind: '섬', stops: ['히라라', '미야코 공항', '요나하 마에하마'] },
  ],
  KR: [
    { name: '서울', kind: '도시', stops: ['성수', '여의도', '잠실', '강남'] },
    { name: '부산', kind: '도시', stops: ['해운대', '서면', '광안리'] },
    { name: '제주', kind: '섬', stops: ['제주시', '애월', '서귀포', '성산'] },
  ],
  TW: [
    { name: '타이베이', kind: '도시', stops: ['시먼딩', '신이', '중산'] },
    { name: '가오슝', kind: '도시', stops: ['쭤잉', '옌청', '산둬'] },
    { name: '타이중', kind: '도시', stops: ['타이중역', '시툰', '펑지아'] },
  ],
  HK: [{ name: '홍콩', kind: '지역', stops: ['침사추이', '센트럴', '코즈웨이베이', '몽콕'] }],
  CN: [
    { name: '상하이', kind: '도시', stops: ['난징동루', '신톈디', '푸동'] },
    { name: '베이징', kind: '도시', stops: ['왕푸징', '싼리툰', '첸먼'] },
  ],
  TH: [
    { name: '방콕', kind: '도시', stops: ['시암', '아속', '짜뚜짝'] },
    { name: '치앙마이', kind: '도시', stops: ['올드시티', '님만해민', '나이트바자'] },
    { name: '푸껫', kind: '섬', stops: ['푸껫타운', '빠통', '카론'] },
  ],
  VN: [
    { name: '다낭', kind: '도시', stops: ['한시장', '미케비치', '용다리'] },
    { name: '하노이', kind: '도시', stops: ['호안끼엠', '서호', '올드쿼터'] },
    { name: '호찌민', kind: '도시', stops: ['1군', '3군', '타오디엔'] },
  ],
  SG: [{ name: '싱가포르', kind: '도시', stops: ['마리나베이', '오차드', '하지레인', '주얼 창이'] }],
  MY: [
    { name: '쿠알라룸푸르', kind: '도시', stops: ['부킷빈탕', 'KLCC', '차이나타운'] },
    { name: '페낭', kind: '섬', stops: ['조지타운', '바투페링기', '거니드라이브'] },
  ],
  ID: [
    { name: '발리', kind: '섬', stops: ['스미냑', '우붓', '꾸따', '누사두아'] },
    { name: '자카르타', kind: '도시', stops: ['중앙 자카르타', '남부 자카르타', 'PIK'] },
  ],
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
