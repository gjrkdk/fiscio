import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type Stats = {
  omzetMaand: number
  kmJaar: number
  openFacturen: number
  openBedrag: number
}

export default function DashboardScreen() {
  const { session } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!session?.user) return
    laadStats(session.user.id)
  }, [session])

  async function laadStats(userId: string) {
    const nu = new Date()
    const beginMaand = new Date(nu.getFullYear(), nu.getMonth(), 1).toISOString()
    const beginJaar = new Date(nu.getFullYear(), 0, 1).toISOString()

    const [{ data: facturen }, { data: ritten }] = await Promise.all([
      supabase.from('invoices').select('total, status, created_at').eq('user_id', userId),
      supabase.from('trips').select('distance_km, is_business_trip, started_at').eq('user_id', userId),
    ])

    const omzetMaand = (facturen ?? [])
      .filter(f => f.status !== 'draft' && f.created_at >= beginMaand)
      .reduce((s, f) => s + parseFloat(f.total ?? '0'), 0)

    const openFacturen = (facturen ?? []).filter(f => f.status === 'sent')
    const openBedrag = openFacturen.reduce((s, f) => s + parseFloat(f.total ?? '0'), 0)

    const kmJaar = (ritten ?? [])
      .filter(r => r.is_business_trip && r.started_at >= beginJaar)
      .reduce((s, r) => s + parseFloat(r.distance_km ?? '0'), 0)

    setStats({ omzetMaand, kmJaar, openFacturen: openFacturen.length, openBedrag })
  }

  async function handleLogout() {
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Uitloggen', style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ])
  }

  const email = session?.user?.email ?? ''

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={st.scroll}>
        {/* Header */}
        <View style={st.header}>
          <View>
            <Text style={st.heading}>Dashboard</Text>
            <Text style={st.email} numberOfLines={1}>{email}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={st.logoutBtn}>
            <Text style={st.logoutTxt}>Uitloggen</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={st.grid}>
          <View style={st.card}>
            <Text style={st.cardLabel}>Omzet deze maand</Text>
            <Text style={st.cardValue}>
              {stats ? `€ ${stats.omzetMaand.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}` : '—'}
            </Text>
          </View>
          <View style={st.card}>
            <Text style={st.cardLabel}>Zakelijke km (jaar)</Text>
            <Text style={st.cardValue}>
              {stats ? `${Math.round(stats.kmJaar).toLocaleString('nl-NL')} km` : '—'}
            </Text>
          </View>
        </View>

        <View style={[st.card, st.cardFull, stats?.openFacturen ? st.cardWaarschuwing : null]}>
          <Text style={[st.cardLabel, stats?.openFacturen ? st.labelWaarschuwing : null]}>
            Openstaande facturen
          </Text>
          <Text style={[st.cardValue, stats?.openFacturen ? st.valueWaarschuwing : null]}>
            {stats
              ? stats.openFacturen === 0
                ? 'Geen'
                : `${stats.openFacturen} · € ${stats.openBedrag.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`
              : '—'}
          </Text>
        </View>

        <View style={[st.card, st.cardFull]}>
          <Text style={st.cardLabel}>Km-vergoeding (€0,23/km)</Text>
          <Text style={[st.cardValue, { color: '#16a34a' }]}>
            {stats
              ? `€ ${(stats.kmJaar * 0.23).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 12 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#111827' },
  email: { fontSize: 12, color: '#9ca3af', marginTop: 2, maxWidth: 200 },
  logoutBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  logoutTxt: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  grid: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardFull: { flex: 0 },
  cardWaarschuwing: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  cardLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  labelWaarschuwing: { color: '#92400e' },
  cardValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  valueWaarschuwing: { color: '#b45309' },
})
