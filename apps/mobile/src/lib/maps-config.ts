/** Expo needs statically named env reads. Accept the previous name during migration. */
export const GOOGLE_WEB_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY?.trim()
  || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  || '';

/** Kakao JavaScript key for domestic direct-deal maps and reverse geocoding. */
export const KAKAO_MAPS_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_MAPS_JS_KEY?.trim() || '';

/** The preview server adds a fresh CSP nonce to its HTML response. */
export function mapCspNonce() {
  if (typeof document === 'undefined') return '';
  const value = document.querySelector<HTMLMetaElement>('meta[name="moa-csp-nonce"]')?.content || '';
  return /^[A-Za-z0-9+/=]+$/.test(value) ? value : '';
}
