/** Expo needs statically named env reads. Accept the previous name during migration. */
export const GOOGLE_WEB_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY?.trim()
  || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  || '';
