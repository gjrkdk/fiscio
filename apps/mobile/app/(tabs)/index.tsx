import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Dashboard</Text>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.label}>Omzet (mnd)</Text>
            <Text style={styles.value}>€ —</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Km (jaar)</Text>
            <Text style={styles.value}>— km</Text>
          </View>
        </View>
        <View style={[styles.card, { marginTop: 0 }]}>
          <Text style={styles.label}>Openstaande facturen</Text>
          <Text style={styles.value}>—</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardRow: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '700', color: '#111827' },
})
