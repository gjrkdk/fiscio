import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen
        name="ritten"
        options={{ title: 'Ritten' }}
      />
      <Tabs.Screen
        name="kosten"
        options={{ title: 'Kosten' }}
      />
      <Tabs.Screen
        name="facturen"
        options={{ title: 'Facturen' }}
      />
    </Tabs>
  )
}
