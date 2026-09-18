import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

const KAKAO_ANDROID_MAVEN_REPOSITORY =
  'https://devrepo.kakao.com/nexus/content/groups/public/';

export default ({ config }: ConfigContext): ExpoConfig => {
  const kakaoNativeAppKey = process.env.KAKAO_NATIVE_APP_KEY?.trim();
  const googleMapsAndroidApiKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const googleMapsIosApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim();
  const baseConfig: ExpoConfig = {
    ...config,
    name: config.name ?? appJson.expo.name,
    slug: config.slug ?? appJson.expo.slug,
  };
  const plugins: NonNullable<ExpoConfig['plugins']> = [
    ...(baseConfig.plugins ?? []),
  ];

  if (kakaoNativeAppKey) {
    plugins.push(
      ['@react-native-seoul/kakao-login', { kakaoAppKey: kakaoNativeAppKey }],
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: [KAKAO_ANDROID_MAVEN_REPOSITORY],
          },
        },
      ],
    );
  }

  // Expo Go has its own native map setup. Custom builds use the platform-
  // restricted SDK keys through the installed react-native-maps config plugin.
  if (!plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'react-native-maps')) {
    plugins.push(['react-native-maps', {
      ...(googleMapsAndroidApiKey ? { androidGoogleMapsApiKey: googleMapsAndroidApiKey } : {}),
      ...(googleMapsIosApiKey ? { iosGoogleMapsApiKey: googleMapsIosApiKey } : {}),
    }]);
  }

  return {
    ...baseConfig,
    plugins,
    ...(googleMapsIosApiKey
      ? {
          ios: {
            ...baseConfig.ios,
            config: {
              ...baseConfig.ios?.config,
              googleMapsApiKey: googleMapsIosApiKey,
            },
          },
        }
      : {}),
    ...(googleMapsAndroidApiKey
      ? {
          android: {
            ...baseConfig.android,
            config: {
              ...baseConfig.android?.config,
              googleMaps: { apiKey: googleMapsAndroidApiKey },
            },
          },
        }
      : {}),
  };
};
