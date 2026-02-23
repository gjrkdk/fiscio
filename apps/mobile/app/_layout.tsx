import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from '../lib/auth'

function RootNavigator() {
  const { session, laden } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (laden) return

    const inAuth = segments[0] === 'login'

    if (!session && !inAuth) {
      router.replace('/login')
    } else if (session && inAuth) {
      router.replace('/(tabs)')
    }
  }, [session, laden, segments])

  if (laden) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
