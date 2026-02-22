import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function KostenScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.heading}>Kosten</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>+ Bon scannen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nog geen bonnetjes ingevoerd</Text>
          <Text style={styles.emptyHint}>Scan een bonnetje met de camera</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
  button: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  emptyHint: { fontSize: 13, color: '#9ca3af' },
})
