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
};

export function getPlacePhoto(place: Place): PlacePhoto | undefined {
  return photos[place.id] || photos[cityPhoto[place.city]];
}
