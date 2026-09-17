export const COUNTRY_CODES = [
  'JP', 'KR', 'TW', 'HK', 'CN', 'TH', 'VN', 'SG', 'MY', 'ID',
  'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO',
  'GB', 'FR', 'IT', 'ES', 'DE', 'CH', 'AU', 'NZ',
  'IN', 'PH', 'KH', 'AE', 'TR', 'ZA', 'EG', 'MA', 'KE', 'TZ',
] as const;
export type Country = typeof COUNTRY_CODES[number];
export const CURRENCY_CODES = [
  'JPY', 'KRW', 'TWD', 'HKD', 'CNY', 'THB', 'VND', 'SGD', 'MYR', 'IDR',
  'USD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'PEN', 'COP',
  'GBP', 'EUR', 'CHF', 'AUD', 'NZD', 'INR', 'PHP', 'KHR', 'AED', 'TRY',
  'ZAR', 'EGP', 'MAD', 'KES', 'TZS',
] as const;
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
  US: { name: '미국', currency: 'USD', cities: ['뉴욕', '로스앤젤레스', '샌프란시스코', '하와이'] },
  CA: { name: '캐나다', currency: 'CAD', cities: ['밴쿠버', '토론토', '몬트리올'] },
  MX: { name: '멕시코', currency: 'MXN', cities: ['멕시코시티', '칸쿤'] },
  BR: { name: '브라질', currency: 'BRL', cities: ['상파울루', '리우데자네이루'] },
  AR: { name: '아르헨티나', currency: 'ARS', cities: ['부에노스아이레스'] },
  CL: { name: '칠레', currency: 'CLP', cities: ['산티아고'] },
  PE: { name: '페루', currency: 'PEN', cities: ['리마', '쿠스코'] },
  CO: { name: '콜롬비아', currency: 'COP', cities: ['보고타', '메데인'] },
  GB: { name: '영국', currency: 'GBP', cities: ['런던', '에든버러'] },
  FR: { name: '프랑스', currency: 'EUR', cities: ['파리', '니스'] },
  IT: { name: '이탈리아', currency: 'EUR', cities: ['로마', '밀라노', '피렌체'] },
  ES: { name: '스페인', currency: 'EUR', cities: ['바르셀로나', '마드리드'] },
  DE: { name: '독일', currency: 'EUR', cities: ['베를린', '프랑크푸르트'] },
  CH: { name: '스위스', currency: 'CHF', cities: ['취리히', '제네바'] },
  AU: { name: '호주', currency: 'AUD', cities: ['시드니', '멜버른', '브리즈번'] },
  NZ: { name: '뉴질랜드', currency: 'NZD', cities: ['오클랜드', '퀸스타운'] },
  IN: { name: '인도', currency: 'INR', cities: ['델리', '뭄바이', '벵갈루루'] },
  PH: { name: '필리핀', currency: 'PHP', cities: ['마닐라', '세부'] },
  KH: { name: '캄보디아', currency: 'KHR', cities: ['프놈펜', '시엠립'] },
  AE: { name: '아랍에미리트', currency: 'AED', cities: ['두바이', '아부다비'] },
  TR: { name: '튀르키예', currency: 'TRY', cities: ['이스탄불', '카파도키아'] },
  ZA: { name: '남아프리카공화국', currency: 'ZAR', cities: ['케이프타운', '요하네스버그'] },
  EG: { name: '이집트', currency: 'EGP', cities: ['카이로', '룩소르'] },
  MA: { name: '모로코', currency: 'MAD', cities: ['마라케시', '카사블랑카'] },
  KE: { name: '케냐', currency: 'KES', cities: ['나이로비', '몸바사'] },
  TZ: { name: '탄자니아', currency: 'TZS', cities: ['잔지바르', '아루샤'] },
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
  US: [
    { name: '뉴욕', kind: '도시', stops: ['맨해튼', '브루클린', '소호'] },
    { name: '로스앤젤레스', kind: '도시', stops: ['할리우드', '산타모니카', '다운타운 LA'] },
    { name: '샌프란시스코', kind: '도시', stops: ['유니언스퀘어', '미션지구', '피셔맨스워프'] },
    { name: '하와이', kind: '지역', stops: ['와이키키', '알라모아나', '노스쇼어'] },
  ],
  CA: [
    { name: '밴쿠버', kind: '도시', stops: ['다운타운', '그랜빌아일랜드', '리치먼드'] },
    { name: '토론토', kind: '도시', stops: ['다운타운', '퀸스트리트', '요크빌'] },
    { name: '몬트리올', kind: '도시', stops: ['올드몬트리올', '마일엔드'] },
  ],
  MX: [
    { name: '멕시코시티', kind: '도시', stops: ['폴랑코', '로마노르테', '소치밀코'] },
    { name: '칸쿤', kind: '지역', stops: ['호텔존', '다운타운', '플라야델카르멘'] },
  ],
  BR: [
    { name: '상파울루', kind: '도시', stops: ['파울리스타', '리베르다지', '빌라 마달레나'] },
    { name: '리우데자네이루', kind: '도시', stops: ['코파카바나', '이파네마', '산타테레사'] },
  ],
  AR: [{ name: '부에노스아이레스', kind: '도시', stops: ['팔레르모', '레콜레타', '산텔모'] }],
  CL: [{ name: '산티아고', kind: '도시', stops: ['프로비덴시아', '벨라비스타', '라스타리아'] }],
  PE: [
    { name: '리마', kind: '도시', stops: ['미라플로레스', '바랑코', '산 이시드로'] },
    { name: '쿠스코', kind: '도시', stops: ['아르마스광장', '산블라스'] },
  ],
  CO: [
    { name: '보고타', kind: '도시', stops: ['라 칸델라리아', '차피네로', '우사켄'] },
    { name: '메데인', kind: '도시', stops: ['엘 포블라도', '코무나 13'] },
  ],
  GB: [
    { name: '런던', kind: '도시', stops: ['소호', '코벤트가든', '노팅힐', '캠던'] },
    { name: '에든버러', kind: '도시', stops: ['올드타운', '뉴타운'] },
  ],
  FR: [
    { name: '파리', kind: '도시', stops: ['마레', '생제르맹', '몽마르트르'] },
    { name: '니스', kind: '도시', stops: ['구시가지', '영국인 산책로'] },
  ],
  IT: [
    { name: '로마', kind: '도시', stops: ['트레비', '트라스테베레', '스페인광장'] },
    { name: '밀라노', kind: '도시', stops: ['브레라', '두오모', '나빌리'] },
    { name: '피렌체', kind: '도시', stops: ['두오모', '산타 크로체'] },
  ],
  ES: [
    { name: '바르셀로나', kind: '도시', stops: ['고딕지구', '그라시아', '람블라스'] },
    { name: '마드리드', kind: '도시', stops: ['살라망카', '말라사냐', '솔'] },
  ],
  DE: [
    { name: '베를린', kind: '도시', stops: ['미테', '크로이츠베르크', '프렌츠라우어베르크'] },
    { name: '프랑크푸르트', kind: '도시', stops: ['알트작센하우젠', '차일'] },
  ],
  CH: [
    { name: '취리히', kind: '도시', stops: ['반호프슈트라세', '구시가지'] },
    { name: '제네바', kind: '도시', stops: ['구시가지', '호숫가'] },
  ],
  AU: [
    { name: '시드니', kind: '도시', stops: ['서큘러키', '뉴타운', '본다이'] },
    { name: '멜버른', kind: '도시', stops: ['CBD', '피츠로이', '세인트 킬다'] },
    { name: '브리즈번', kind: '도시', stops: ['사우스뱅크', '포티튜드밸리'] },
  ],
  NZ: [
    { name: '오클랜드', kind: '도시', stops: ['퀸스트리트', '폰손비', '미션베이'] },
    { name: '퀸스타운', kind: '지역', stops: ['호숫가', '애로우타운'] },
  ],
  IN: [
    { name: '델리', kind: '도시', stops: ['사우스델리', '코놀트플레이스', '하우즈카스'] },
    { name: '뭄바이', kind: '도시', stops: ['콜라바', '반드라', '포트'] },
    { name: '벵갈루루', kind: '도시', stops: ['인디라나가르', '코라망갈라'] },
  ],
  PH: [
    { name: '마닐라', kind: '도시', stops: ['마카티', '보니파시오', '인트라무로스'] },
    { name: '세부', kind: '섬', stops: ['세부시티', '막탄', 'IT파크'] },
  ],
  KH: [
    { name: '프놈펜', kind: '도시', stops: ['리버사이드', 'BKK1', '센트럴마켓'] },
    { name: '시엠립', kind: '지역', stops: ['올드마켓', '펍스트리트'] },
  ],
  AE: [
    { name: '두바이', kind: '도시', stops: ['다운타운', '두바이몰', '주메이라'] },
    { name: '아부다비', kind: '도시', stops: ['야스섬', '코니쉬'] },
  ],
  TR: [
    { name: '이스탄불', kind: '도시', stops: ['베이올루', '카디쾨이', '그랜드바자르'] },
    { name: '카파도키아', kind: '지역', stops: ['괴레메', '우치히사르'] },
  ],
  ZA: [
    { name: '케이프타운', kind: '도시', stops: ['워터프론트', '보캅', '캠프스베이'] },
    { name: '요하네스버그', kind: '도시', stops: ['샌드턴', '멜빌'] },
  ],
  EG: [
    { name: '카이로', kind: '도시', stops: ['자말렉', '칸 엘 칼릴리', '기자'] },
    { name: '룩소르', kind: '지역', stops: ['동쪽 강변', '서쪽 강변'] },
  ],
  MA: [
    { name: '마라케시', kind: '도시', stops: ['메디나', '구엘리즈', '마조렐 정원'] },
    { name: '카사블랑카', kind: '도시', stops: ['하산2세 모스크', '마아리프'] },
  ],
  KE: [
    { name: '나이로비', kind: '도시', stops: ['웨스트랜즈', '카렌', '시티센터'] },
    { name: '몸바사', kind: '지역', stops: ['올드타운', '냐리'] },
  ],
  TZ: [
    { name: '잔지바르', kind: '섬', stops: ['스톤타운', '눙위', '파제'] },
    { name: '아루샤', kind: '도시', stops: ['시계탑', '마사이마켓'] },
  ],
};
// Fixed examples for this prototype, not live rates or executable FX quotes.
export const DEMO_FX_RATES: Record<Currency, number> = {
  JPY: 9.4, KRW: 1, TWD: 44, HKD: 170, CNY: 190,
  THB: 40, VND: 0.055, SGD: 1000, MYR: 300, IDR: 0.085,
  USD: 1400, CAD: 1020, MXN: 82, BRL: 260, ARS: 1.2, CLP: 1.5, PEN: 380, COP: 0.34,
  GBP: 1850, EUR: 1550, CHF: 1650, AUD: 920, NZD: 840, INR: 17, PHP: 25, KHR: 0.35,
  AED: 382, TRY: 42, ZAR: 78, EGP: 28, MAD: 140, KES: 11, TZS: 0.55,
};
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  JPY: '¥', KRW: '₩', TWD: 'NT$', HKD: 'HK$', CNY: 'CN¥',
  THB: '฿', VND: '₫', SGD: 'S$', MYR: 'RM', IDR: 'Rp',
  USD: '$', CAD: 'CA$', MXN: 'MX$', BRL: 'R$', ARS: 'AR$', CLP: 'CL$', PEN: 'S/', COP: 'COL$',
  GBP: '£', EUR: '€', CHF: 'CHF', AUD: 'A$', NZD: 'NZ$', INR: '₹', PHP: '₱', KHR: '៛',
  AED: 'د.إ', TRY: '₺', ZAR: 'R', EGP: 'E£', MAD: 'د.م.', KES: 'KSh', TZS: 'TSh',
};
export const countryName = (country: Country) => DESTINATIONS[country].name;
export const currencyForCountry = (country: Country): Currency => DESTINATIONS[country].currency;
