import type { Place, Country } from './index';

// Representative shopping areas, with approximate area coordinates for the demo map.
const areas: [string, Country, string, string, string, number, number][] = [
  ['p-taipei-ximen', 'TW', '타이베이', '시먼딩', 'XIMENDING', 25.043, 121.508],
  ['p-kaohsiung-pier2', 'TW', '가오슝', '보얼예술특구', 'PIER-2 ART CENTER', 22.620, 120.282],
  ['p-hongkong-pmq', 'HK', '홍콩', 'PMQ 디자인 숍', 'PMQ', 22.284, 114.152],
  ['p-shanghai-tianzifang', 'CN', '상하이', '톈쯔팡', 'TIANZIFANG', 31.208, 121.468],
  ['p-beijing-nanluogu', 'CN', '베이징', '난뤄구샹', 'NANLUOGUXIANG', 39.937, 116.403],
  ['p-bangkok-chatuchak', 'TH', '방콕', '짜뚜짝 시장', 'CHATUCHAK MARKET', 13.800, 100.551],
  ['p-chiangmai-nimman', 'TH', '치앙마이', '님만해민', 'NIMMAN', 18.797, 98.968],
  ['p-danang-han', 'VN', '다낭', '한 시장', 'HAN MARKET', 16.068, 108.224],
  ['p-hanoi-oldquarter', 'VN', '하노이', '올드쿼터', 'HANOI OLD QUARTER', 21.035, 105.851],
  ['p-hochiminh-benthanh', 'VN', '호찌민', '벤탄 시장', 'BEN THANH MARKET', 10.772, 106.698],
  ['p-singapore-haji', 'SG', '싱가포르', '하지 레인', 'HAJI LANE', 1.301, 103.859],
  ['p-kualalumpur-central', 'MY', '쿠알라룸푸르', '센트럴 마켓', 'CENTRAL MARKET', 3.146, 101.695],
  ['p-bali-ubud', 'ID', '발리', '우붓 아트마켓', 'UBUD ART MARKET', -8.507, 115.263],
  ['p-jakarta-grand', 'ID', '자카르타', '그랜드 인도네시아', 'GRAND INDONESIA', -6.195, 106.821],
];
export function asiaPlaces(createdAt: string): Place[] {
  return areas.map(([id, country, city, name, englishName, latitude, longitude]) => ({
    id, createdAt, country, city, name, englishName, latitude, longitude,
    region: name, description: `${city} 여행 중 들를 수 있는 쇼핑 지역이에요. 원하는 매장과 상품을 확인하고 부탁해보세요.`,
    tags: ['로컬 소품', '디자인', '쇼핑'], visitors: 0, requestCount: 0,
    recentTrades: 0, averageReward: 0, theme: 'blue', photo: 'local', extraMinutes: 0,
  }));
}
