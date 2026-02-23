import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Fiscio',
  slug: 'fiscio',
  version: '1.0.0',
  sdkVersion: '54.0.0',
  orientation: 'portrait',
  scheme: 'fiscio',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'nl.fiscio.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Fiscio gebruikt je locatie om ritafstanden nauwkeurig bij te houden.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Fiscio gebruikt je locatie op de achtergrond om ritten automatisch te registreren.',
      UIBackgroundModes: ['location', 'fetch'],
    },
  },
  android: {
    package: 'nl.fiscio.app',
    adaptiveIcon: { backgroundColor: '#2563eb' },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Fiscio gebruikt locatie om ritafstanden bij te houden.',
        locationAlwaysPermission:
          'Fiscio gebruikt locatie op de achtergrond voor ritregistratie.',
        locationWhenInUsePermission:
          'Fiscio gebruikt locatie om ritafstanden bij te houden.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
})
