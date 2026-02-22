import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Dashboard</Text>

        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Omzet (mnd)</Text>
            <Text style={styles.cardValue}>€ —</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Km (jaar)</Text>
            <Text style={styles.cardValue}>— km</Text>
          </View>
        </View>

        <View style={[styles.card, styles.fullCard]}>
          <Text style={styles.cardLabel}>Openstaande facturen</Text>
          <Text style={styles.cardValue}>—</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fullCard: {
    flex: 0,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
})
