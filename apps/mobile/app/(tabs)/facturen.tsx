import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type Factuur = {
  id: string
  invoice_number: string
  client_name: string
  client_email: string | null
  total: string
  status: string
  created_at: string
  due_date: string | null
  sent_at: string | null
}

const STATUS_CONFIG: Record<string, { label: string; kleur: string; tekstKleur: string }> = {
  draft:   { label: 'Concept',   kleur: '#f3f4f6', tekstKleur: '#6b7280' },
  sent:    { label: 'Verzonden', kleur: '#dbeafe', tekstKleur: '#1d4ed8' },
  paid:    { label: 'Betaald',   kleur: '#dcfce7', tekstKleur: '#16a34a' },
}

function euro(val: string) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(parseFloat(val ?? '0'))
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FacturenScreen() {
  const { session } = useAuth()
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [laden, setLaden] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all')

  const laadFacturen = useCallback(async () => {
    if (!session?.user) return
    const { data } = await supabase
      .from('invoices')
      .select('id,invoice_number,client_name,client_email,total,status,created_at,due_date,sent_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (data) setFacturen(data as Factuur[])
    setLaden(false)
    setRefreshing(false)
  }, [session])

  useEffect(() => { laadFacturen() }, [laadFacturen])

  async function wijzigStatus(id: string, nieuweStatus: string) {
    const updates: Record<string, any> = {
      status: nieuweStatus,
      updated_at: new Date().toISOString(),
    }
    if (nieuweStatus === 'sent') updates.sent_at = new Date().toISOString()
    if (nieuweStatus === 'paid') updates.paid_at = new Date().toISOString()

    const { error } = await supabase.from('invoices').update(updates).eq('id', id)
    if (error) { Alert.alert('Fout', error.message); return }
    setFacturen(f => f.map(fac => fac.id === id ? { ...fac, status: nieuweStatus } : fac))
  }

  const gefiltered = facturen.filter(f => filter === 'all' || f.status === filter)
  const totaalOpen = facturen
    .filter(f => f.status === 'sent')
    .reduce((s, f) => s + parseFloat(f.total), 0)

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); laadFacturen() }} />}
      >
        <View style={st.header}>
          <Text style={st.heading}>Facturen</Text>
          {totaalOpen > 0 && (
            <Text style={st.openstaand}>{euro(totaalOpen.toString())} openstaand</Text>
          )}
        </View>

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterBar} contentContainerStyle={st.filterContent}>
          {(['all', 'draft', 'sent', 'paid'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[st.filterChip, filter === f && st.filterChipActief]}
              onPress={() => setFilter(f)}
            >
              <Text style={[st.filterTxt, filter === f && st.filterTxtActief]}>
                {f === 'all' ? 'Alle' : STATUS_CONFIG[f]?.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {laden ? (
          <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />
        ) : gefiltered.length === 0 ? (
          <View style={st.leeg}>
            <Text style={st.leegIcon}>📄</Text>
            <Text style={st.leegTitel}>Geen facturen</Text>
            <Text style={st.leegTxt}>Maak facturen aan via de webapp</Text>
          </View>
        ) : (
          gefiltered.map(f => {
            const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.draft!
            const isVervallen = f.status === 'sent' && f.due_date && new Date(f.due_date) < new Date()
            return (
              <View key={f.id} style={st.kaart}>
                <View style={st.kaartTop}>
                  <Text style={st.nummer}>{f.invoice_number}</Text>
                  <Text style={st.bedrag}>{euro(f.total)}</Text>
                </View>
                <Text style={st.klant}>{f.client_name}</Text>
                <View style={st.kaartBot}>
                  <Text style={[st.datum, isVervallen && { color: '#ef4444' }]}>
                    {isVervallen ? '⚠ Vervallen' : formatDatum(f.created_at)}
                  </Text>
                  <View style={[st.badge, { backgroundColor: cfg.kleur }]}>
                    <Text style={[st.badgeTxt, { color: cfg.tekstKleur }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Status acties */}
                <View style={st.acties}>
                  {f.status === 'draft' && (
                    <TouchableOpacity
                      style={[st.actieBtn, { backgroundColor: '#dbeafe' }]}
                      onPress={() => wijzigStatus(f.id, 'sent')}
                    >
                      <Text style={[st.actieTxt, { color: '#1d4ed8' }]}>Markeer verzonden</Text>
                    </TouchableOpacity>
                  )}
                  {f.status === 'sent' && (
                    <TouchableOpacity
                      style={[st.actieBtn, { backgroundColor: '#dcfce7' }]}
                      onPress={() => Alert.alert(
                        'Markeer betaald',
                        `Factuur ${f.invoice_number} als betaald markeren?`,
                        [
                          { text: 'Annuleren', style: 'cancel' },
                          { text: 'Betaald', onPress: () => wijzigStatus(f.id, 'paid') },
                        ]
                      )}
                    >
                      <Text style={[st.actieTxt, { color: '#16a34a' }]}>Markeer betaald ✓</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 48 },
  header: { marginBottom: 12 },
  heading: { fontSize: 28, fontWeight: '800', color: '#111827' },
  openstaand: { fontSize: 13, color: '#d97706', fontWeight: '600', marginTop: 2 },
  filterBar: { marginBottom: 16 },
  filterContent: { gap: 8, paddingRight: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: '#f3f4f6' },
  filterChipActief: { backgroundColor: '#2563eb' },
  filterTxt: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  filterTxtActief: { color: '#fff', fontWeight: '700' },
  leeg: { alignItems: 'center', paddingTop: 60 },
  leegIcon: { fontSize: 40, marginBottom: 10 },
  leegTitel: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  leegTxt: { fontSize: 13, color: '#9ca3af' },
  kaart: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  kaartTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  nummer: { fontSize: 13, fontWeight: '700', color: '#6b7280', fontVariant: ['tabular-nums'] },
  bedrag: { fontSize: 18, fontWeight: '800', color: '#111827' },
  klant: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  kaartBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  datum: { fontSize: 12, color: '#9ca3af' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  badgeTxt: { fontSize: 12, fontWeight: '600' },
  acties: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  actieBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  actieTxt: { fontSize: 13, fontWeight: '700' },
})
