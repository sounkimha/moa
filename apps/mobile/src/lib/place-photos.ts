import type { ImageSourcePropType } from 'react-native';
import type { Place } from '@moa/domain';
import landmarks from './landmark-photos.json';

type PlacePhoto = {
  source: ImageSourcePropType;
  label: string;
  author: string;
  license: string;
  url: string;
};

const commonsPhoto = (label: string, imageUrl: string, sourceUrl: string): PlacePhoto => ({
  source: { uri: imageUrl },
  label,
  author: 'Wikimedia Commons contributors',
  license: 'Wikimedia Commons · 원본 페이지 기준',
  url: sourceUrl,
});

const photos: Record<string, PlacePhoto> = {
  'p-shibuya': {
    source: require('../../assets/tokyo-shibuya.jpg'),
    label: '도쿄 · 시부야 교차로',
    author: 'David Kernan',
    license: 'CC BY 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Shibuya_Crossing,_Aerial.jpg',
  },
  'p-station': {
    source: require('../../assets/tokyo-station.jpg'),
    label: '도쿄 · 도쿄역',
    author: 'MaedaAkihiko',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Tokyo-STA_Marunouchi-Entrance_2023.jpg',
  },
  'p-disney': {
    source: require('../../assets/tokyo-disneysea.jpg'),
    label: '도쿄 근교 · 디즈니씨',
    author: 'Louiemantia',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Mt_Prometheus_at_Tokyo_DisneySea.jpg',
  },
  'p-osaka': {
    source: require('../../assets/osaka-dotonbori.jpg'),
    label: '오사카 · 도톤보리',
    author: 'Type specimen',
    license: 'CC BY-SA 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_Ebisu_Bridge.jpg',
  },
  'p-fukuoka': {
    source: require('../../assets/fukuoka-hakata.jpg'),
    label: '후쿠오카 · 하카타역',
    author: 'Hakataman',
    license: 'CC BY-SA 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hakata_Station_illuminations.JPG',
  },
  'p-sapporo': {
    source: require('../../assets/sapporo-odori.jpg'),
    label: '삿포로 · 오도리공원',
    author: 'Nkns',
    license: 'CC BY-SA 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Hokkaido_Sapporo_Odori_Park.jpg',
  },
  'p-seongsu': {
    source: require('../../assets/seoul-seongsu-popup-street.jpg'),
    label: '서울 · 성수 팝업 거리',
    author: 'MOA',
    license: 'AI 생성 이미지 · 체험용',
    url: 'https://openai.com/policies/terms-of-use/',
  },
  seoul: { ...landmarks.seoul, source: require('../../assets/seoul-gyeongbokgung.jpg') },
  jeju: { ...landmarks.jeju, source: require('../../assets/jeju-seongsan.jpg') },
  taipei: { ...landmarks.taipei, source: require('../../assets/taipei-101.jpg') },
  kaohsiung: { ...landmarks.kaohsiung, source: require('../../assets/kaohsiung-dragon-tiger-pagodas.jpg') },
  hongkong: { ...landmarks.hongkong, source: require('../../assets/hongkong-victoria-harbour.jpg') },
  shanghai: { ...landmarks.shanghai, source: require('../../assets/shanghai-pudong.jpg') },
  beijing: { ...landmarks.beijing, source: require('../../assets/beijing-temple-of-heaven.jpg') },
  bangkok: { ...landmarks.bangkok, source: require('../../assets/bangkok-wat-arun.jpg') },
  chiangmai: { ...landmarks.chiangmai, source: require('../../assets/chiangmai-doi-suthep.jpg') },
  danang: { ...landmarks.danang, source: require('../../assets/danang-dragon-bridge.jpg') },
  hanoi: { ...landmarks.hanoi, source: require('../../assets/hanoi-hoan-kiem.jpg') },
  hochiminh: { ...landmarks.hochiminh, source: require('../../assets/hochiminh-central-post-office.jpg') },
  singapore: { ...landmarks.singapore, source: require('../../assets/singapore-marina-bay.jpg') },
  kualalumpur: { ...landmarks.kualalumpur, source: require('../../assets/kualalumpur-petronas.jpg') },
  bali: { ...landmarks.bali, source: require('../../assets/bali-ulun-danu.jpg') },
  jakarta: { ...landmarks.jakarta, source: require('../../assets/jakarta-monas.jpg') },
  'world-new-york': commonsPhoto(
    '미국 · 뉴욕 스카이라인',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Long_Island_City_New_York_May_2015_panorama_3.jpg/960px-Long_Island_City_New_York_May_2015_panorama_3.jpg',
    'https://commons.wikimedia.org/wiki/File:Long_Island_City_New_York_May_2015_panorama_3.jpg',
  ),
  'world-los-angeles': commonsPhoto(
    '미국 · 로스앤젤레스',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Los_Angeles_Pollution.jpg/960px-Los_Angeles_Pollution.jpg',
    'https://commons.wikimedia.org/wiki/File:Los_Angeles_Pollution.jpg',
  ),
  'world-san-francisco': commonsPhoto(
    '미국 · 샌프란시스코',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/San_Francisco_from_Twin_Peaks_September_2013_panorama_5_edit.jpg/960px-San_Francisco_from_Twin_Peaks_September_2013_panorama_5_edit.jpg',
    'https://commons.wikimedia.org/wiki/File:San_Francisco_from_Twin_Peaks_September_2013_panorama_5_edit.jpg',
  ),
  'world-vancouver': commonsPhoto(
    '캐나다 · 밴쿠버',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Vancouver_dusk_pano.jpg/960px-Vancouver_dusk_pano.jpg',
    'https://commons.wikimedia.org/wiki/File:Vancouver_dusk_pano.jpg',
  ),
  'world-toronto': commonsPhoto(
    '캐나다 · 토론토',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Sunset_Toronto_Skyline_Panorama_Crop_from_Snake_Island.jpg/960px-Sunset_Toronto_Skyline_Panorama_Crop_from_Snake_Island.jpg',
    'https://commons.wikimedia.org/wiki/File:Sunset_Toronto_Skyline_Panorama_Crop_from_Snake_Island.jpg',
  ),
  'world-mexico': commonsPhoto(
    '멕시코 · 멕시코시티',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Mexico_City_Skyline_%285604867225%29.jpg/960px-Mexico_City_Skyline_%285604867225%29.jpg',
    'https://commons.wikimedia.org/wiki/File:Mexico_City_Skyline_(5604867225).jpg',
  ),
  'world-rio': commonsPhoto(
    '브라질 · 리우데자네이루',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Rio_de_Janeiro_skyline_and_Sugarloaf_Mountain_at_sunset%2C_Brazil_3.jpg/960px-Rio_de_Janeiro_skyline_and_Sugarloaf_Mountain_at_sunset%2C_Brazil_3.jpg',
    'https://commons.wikimedia.org/wiki/File:Rio_de_Janeiro_skyline_and_Sugarloaf_Mountain_at_sunset,_Brazil_3.jpg',
  ),
  'world-buenos-aires': commonsPhoto(
    '아르헨티나 · 부에노스아이레스',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/193_-_Buenos_Aires_-_Puerto_Madero_-_Janvier_2010.jpg/960px-193_-_Buenos_Aires_-_Puerto_Madero_-_Janvier_2010.jpg',
    'https://commons.wikimedia.org/wiki/File:193_-_Buenos_Aires_-_Puerto_Madero_-_Janvier_2010.jpg',
  ),
  'world-lima': commonsPhoto(
    '페루 · 리마',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Lima%2C_Urban_Skyline--Ciudad_de_Lima%2C_Skyline_urbano.jpg/960px-Lima%2C_Urban_Skyline--Ciudad_de_Lima%2C_Skyline_urbano.jpg',
    'https://commons.wikimedia.org/wiki/File:Lima,_Urban_Skyline--Ciudad_de_Lima,_Skyline_urbano.jpg',
  ),
  'world-london': commonsPhoto(
    '세계 · 대표 도시 풍경',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/London_Skyline_from_Waterloo_Bridge%2C_London%2C_UK_-_Diliff.jpg/960px-London_Skyline_from_Waterloo_Bridge%2C_London%2C_UK_-_Diliff.jpg',
    'https://commons.wikimedia.org/wiki/File:London_Skyline_from_Waterloo_Bridge,_London,_UK_-_Diliff.jpg',
  ),
};

const cityPhoto: Record<string, string> = {
  도쿄: 'p-shibuya',
  오사카: 'p-osaka',
  후쿠오카: 'p-fukuoka',
  삿포로: 'p-sapporo',
  서울: 'seoul',
  제주: 'jeju',
  타이베이: 'taipei',
  가오슝: 'kaohsiung',
  홍콩: 'hongkong',
  상하이: 'shanghai',
  베이징: 'beijing',
  방콕: 'bangkok',
  치앙마이: 'chiangmai',
  다낭: 'danang',
  하노이: 'hanoi',
  호찌민: 'hochiminh',
  싱가포르: 'singapore',
  쿠알라룸푸르: 'kualalumpur',
  발리: 'bali',
  자카르타: 'jakarta',
  뉴욕: 'world-new-york', 로스앤젤레스: 'world-los-angeles', 샌프란시스코: 'world-san-francisco', 하와이: 'world-new-york',
  밴쿠버: 'world-vancouver', 토론토: 'world-toronto', 몬트리올: 'world-vancouver', 멕시코시티: 'world-mexico', 칸쿤: 'world-mexico',
  상파울루: 'world-rio', 리우데자네이루: 'world-rio', 부에노스아이레스: 'world-buenos-aires', 산티아고: 'world-lima', 리마: 'world-lima', 쿠스코: 'world-lima', 보고타: 'world-lima', 메데인: 'world-lima',
  런던: 'world-london', 에든버러: 'world-london', 파리: 'world-london', 니스: 'world-london', 로마: 'world-london', 밀라노: 'world-london', 피렌체: 'world-london', 바르셀로나: 'world-london', 마드리드: 'world-london', 베를린: 'world-london', 프랑크푸르트: 'world-london', 취리히: 'world-london', 제네바: 'world-london',
  시드니: 'world-london', 멜버른: 'world-london', 브리즈번: 'world-london', 오클랜드: 'world-london', 퀸스타운: 'world-london', 델리: 'world-london', 뭄바이: 'world-london', 벵갈루루: 'world-london', 마닐라: 'world-london', 세부: 'world-london', 프놈펜: 'world-london', 시엠립: 'world-london', 두바이: 'world-london', 아부다비: 'world-london', 이스탄불: 'world-london', 카파도키아: 'world-london', 케이프타운: 'world-london', 요하네스버그: 'world-london', 카이로: 'world-london', 룩소르: 'world-london', 마라케시: 'world-london', 카사블랑카: 'world-london', 나이로비: 'world-london', 몸바사: 'world-london', 잔지바르: 'world-london', 아루샤: 'world-london',
};

export function getPlacePhoto(place: Place): PlacePhoto | undefined {
  return photos[place.id] || photos[cityPhoto[place.city]];
}
