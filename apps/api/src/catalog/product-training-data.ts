import type { Currency, ProductAvailability, ProductStore } from '@moa/domain';
export type RecognitionSignals = {
  extractedText: string[];
  character: string;
  productName: string;
  productType: string;
  category: 'CHARACTER' | 'GAME' | 'POPUP' | 'LOCAL' | 'FASHION' | 'CONCERT';
  art: 'keyring' | 'plush' | 'pouch' | 'tshirt' | 'pin' | 'bag';
  storeName: string;
  purchaseLocation: string;
  priceAmount: number | null;
  /** Fallback local retail estimate when no visible price is available. */
  priceEstimateAmount: number | null;
  priceEstimateConfidence: number;
  currency: Currency | null;
  colors: string[];
  brandName: string;
  availability: ProductAvailability;
  stores: ProductStore[];
  confidence: { product: number; location: number; store: number };
};

/**
 * Editable reference examples for matching OCR and visual-recognition signals to
 * the demo catalog. This is retrieval data, not a claim that the vision model
 * itself has been fine-tuned on these products.
 */
export const PRODUCT_RECOGNITION_EXAMPLES = [
  {
    productId: 'product-1',
    aliases: ['치이카와', 'ちいかわ', 'chiikawa', '도쿄역', '東京駅', '키링', 'keyring', '마스코트'],
  },
  {
    productId: 'product-2',
    aliases: ['피카츄', 'ピカチュウ', 'pikachu', '봉제인형', 'plush', '포켓몬'],
  },
  {
    productId: 'product-3',
    aliases: ['시부야', '渋谷', '파우치', 'pouch', '캔버스'],
  },
  {
    productId: 'product-5',
    aliases: ['하치와레', 'ハチワレ', 'hachiware', '트래블', '파우치', 'pouch'],
  },
  {
    productId: 'product-8',
    aliases: ['쿠로미', 'クロミ', 'kuromi', '키링', 'keyring'],
  },
  {
    productId: 'product-11',
    aliases: ['성수', '팝업', '에코백', 'eco bag', 'tote bag'],
  },
  {
    productId: 'product-12',
    aliases: ['투어', '콘서트', 'md', '티셔츠', 't-shirt', '반팔'],
  },
] as const;

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[\s·_\-]/g, '');

export function rankCatalogProducts(signals: RecognitionSignals) {
  const haystack = normalize(
    [
      ...signals.extractedText,
      signals.character,
      signals.productName,
      signals.productType,
      signals.storeName,
      signals.purchaseLocation,
      ...signals.colors,
    ].join(' '),
  );
  return PRODUCT_RECOGNITION_EXAMPLES.map((example) => ({
    productId: example.productId,
    score: example.aliases.reduce(
      (score, alias) => score + (haystack.includes(normalize(alias)) ? 1 : 0),
      0,
    ),
  }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);
}
