import { Tabs } from 'expo-router'
import { Text } from 'react-native'

const icon = (emoji: string) => ({ tabBarIcon: () => <Text style={{ fontSize: 20 }}>{emoji}</Text> })

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Dashboard', ...icon('🏠') }} />
      <Tabs.Screen name="ritten"   options={{ title: 'Ritten',    ...icon('🚗') }} />
      <Tabs.Screen name="kosten"   options={{ title: 'Kosten',    ...icon('🧾') }} />
      <Tabs.Screen name="facturen" options={{ title: 'Facturen',  ...icon('📄') }} />
      <Tabs.Screen name="meer"     options={{ title: 'Meer',      ...icon('⚙️') }} />
    </Tabs>
  )
}
