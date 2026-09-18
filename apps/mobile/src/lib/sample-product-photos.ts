import type { ImageSourcePropType } from 'react-native';
import type { ProductRequest } from '@moa/domain';

export type SamplePhotoProduct = Pick<ProductRequest, 'productName' | 'productUrl' | 'productImage'>;
type SampleProductPhoto = {
  requestName: string;
  label: string;
  source: ImageSourcePropType;
  sourcePage: string;
  credit: string;
};

// Photos illustrate the existing demo fixtures, not confirmed stock, pricing,
// store availability or regional exclusivity. Never match a user's photo by art.
const photos: Record<string, SampleProductPhoto> = {
  'https://demo.moa.local/products/5': {
    requestName: '하치와레 트래블 파우치',
    label: '하치와레 블루 체크 파우치',
    source: require('../../assets/sample-hachiware-pouch.jpg'),
    sourcePage: 'https://chiikawamarket.jp/products/4570189195508',
    credit: '치이카와 마켓',
  },
  'https://demo.moa.local/products/6': {
    requestName: '도쿄 한정 아크릴 키링',
    label: '도쿄역 역명판 아크릴 키링',
    source: require('../../assets/sample-tokyo-keyring.jpg'),
    sourcePage: 'https://market.jr-central.co.jp/shop/g/gD4513315032964/',
    credit: 'JR 도카이 MARKET · PLUSTA',
  },
  'https://demo.moa.local/products/15': {
    requestName: '몰랑 여행 미니 인형',
    label: '몰랑 12cm 봉제인형',
    source: require('../../assets/sample-molang-plush.jpg'),
    sourcePage: 'https://shop.molang.com/products/molang-plush-12cm',
    credit: 'Molang 공식 스토어',
  },
};

export function getSampleProductPhoto(product?: SamplePhotoProduct): SampleProductPhoto | undefined {
  if (!product || product.productImage) return undefined;
  const photo = photos[product.productUrl];
  return photo?.requestName === product.productName ? photo : undefined;
}
