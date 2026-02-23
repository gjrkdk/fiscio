import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra ?? {}

export const API_URL: string =
  extra.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://fiscio.vercel.app'
