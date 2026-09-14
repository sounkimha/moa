import type { ImageSourcePropType } from 'react-native';
import type { Place } from '@moa/domain';

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
};

const cityPhoto: Record<string, string> = {
  도쿄: 'p-shibuya',
  오사카: 'p-osaka',
  후쿠오카: 'p-fukuoka',
  삿포로: 'p-sapporo',
};

export function getPlacePhoto(place: Place): PlacePhoto | undefined {
  if (place.country !== 'JP') return undefined;
  return photos[place.id] || photos[cityPhoto[place.city]];
}
