import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, ScrollView, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  startTracking, stopTracking, slaRitOp, isTrackingActief,
  getLiveCoords, getActiveMeta, berekenTotaalKm,
} from '../../lib/tripTracking'
import { supabase } from '../../lib/supabase'

type Rit = {
  id: string
  description: string
  distance_km: string
  started_at: string
  ended_at: string
  start_address: string
  end_address: string
  is_business_trip: boolean
}

function formatDuur(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function formatTijd(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export default function RittenScreen() {
  const [isActief, setIsActief] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [ritten, setRitten] = useState<Rit[]>([])
  const [laden, setLaden] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [duurSec, setDuurSec] = useState(0)
  const [liveKm, setLiveKm] = useState(0)
  const [ritNaam, setRitNaam] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const coordsRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Modals
  const [toonStartModal, setToonStartModal] = useState(false)
  const [toonOpslaanModal, setToonOpslaanModal] = useState(false)
  const [startOmschrijving, setStartOmschrijving] = useState('')
  const [eindResultaat, setEindResultaat] = useState<{ distanceKm: number; duurSec: number } | null>(null)
  const [startAdres, setStartAdres] = useState('')
  const [eindAdres, setEindAdres] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const laadRitten = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLaden(false); return }
      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50)
      if (data) setRitten(data as Rit[])
    } finally {
      setLaden(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const actief = await isTrackingActief()
      setIsActief(actief)
      if (actief) {
        const meta = await getActiveMeta()
        if (meta) {
          setRitNaam(meta.description)
          setDuurSec(Math.floor((Date.now() - new Date(meta.startedAt).getTime()) / 1000))
        }
      }
    }
    init()
    laadRitten()
  }, [laadRitten])

  useEffect(() => {
    if (isActief) {
      timerRef.current = setInterval(() => setDuurSec(s => s + 1), 1000)
      coordsRef.current = setInterval(async () => {
        const coords = await getLiveCoords()
        setLiveKm(berekenTotaalKm(coords))
      }, 3000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (coordsRef.current) clearInterval(coordsRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (coordsRef.current) clearInterval(coordsRef.current)
    }
  }, [isActief])

  async function handleStart() {
    if (!startOmschrijving.trim()) return
    setIsStarting(true)
    try {
      await startTracking(startOmschrijving)
      setRitNaam(startOmschrijving)
      setDuurSec(0); setLiveKm(0)
      setIsActief(true)
      setToonStartModal(false)
      setStartOmschrijving('')
    } catch (e) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Starten mislukt')
    } finally {
      setIsStarting(false)
    }
  }

  async function handleStop() {
    setIsStopping(true)
    try {
      const r = await stopTracking()
      if (!r) return
      setIsActief(false)
      setEindResultaat({ distanceKm: r.distanceKm, duurSec: r.duurSec })
      setToonOpslaanModal(true)
    } catch (e) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Stoppen mislukt')
    } finally {
      setIsStopping(false)
    }
  }

  async function handleOpslaan() {
    if (!eindResultaat) return
    setIsSaving(true)
    try {
      const meta = await getActiveMeta() ?? {
        startedAt: new Date().toISOString(),
        description: ritNaam,
      }
      await slaRitOp(meta, eindResultaat.distanceKm, new Date(),
        startAdres || 'Onbekend vertrek', eindAdres || 'Onbekend aankomst')
      setToonOpslaanModal(false)
      setStartAdres(''); setEindAdres(''); setEindResultaat(null)
      await laadRitten()
    } catch (e) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setIsSaving(false)
    }
  }

  const totaalZakelijkKm = ritten
    .filter(r => r.is_business_trip)
    .reduce((s, r) => s + parseFloat(r.distance_km), 0)

  return (
    <SafeAreaView style={st.safe} edges={['bottom']}>
      {/* Actieve rit — full-screen banner */}
      {isActief && (
        <View style={st.activeBanner}>
          <View style={st.liveRow}>
            <View style={st.liveDot} />
            <Text style={st.liveLabel}>RIT ACTIEF</Text>
          </View>
          <Text style={st.activeNaam} numberOfLines={1}>{ritNaam}</Text>
          <View style={st.statsRow}>
            <View style={st.statItem}>
              <Text style={st.statVal}>{formatDuur(duurSec)}</Text>
              <Text style={st.statLbl}>Tijd</Text>
            </View>
            <View style={st.statSep} />
            <View style={st.statItem}>
              <Text style={st.statVal}>{liveKm.toFixed(2)}</Text>
              <Text style={st.statLbl}>km</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[st.stopBtn, isStopping && st.disabled]}
            onPress={handleStop}
            disabled={isStopping}
            activeOpacity={0.85}
          >
            {isStopping
              ? <ActivityIndicator color="#fff" />
              : <Text style={st.stopTxt}>■  Stop rit</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); laadRitten() }} />
        }
      >
        {/* Header */}
        {!isActief && (
          <View style={st.header}>
            <View>
              <Text style={st.heading}>Ritten</Text>
              {ritten.length > 0 && (
                <Text style={st.subheading}>
                  {totaalZakelijkKm.toFixed(0)} km zakelijk · {ritten.length} ritten
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={st.startBtn}
              onPress={() => setToonStartModal(true)}
              activeOpacity={0.85}
            >
              <Text style={st.startTxt}>+ Rit starten</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lege staat / laden */}
        {laden ? (
          <View style={st.center}>
            <ActivityIndicator color="#2563eb" size="large" />
          </View>
        ) : ritten.length === 0 ? (
          <View style={st.emptyState}>
            <Text style={st.emptyIcon}>🚗</Text>
            <Text style={st.emptyTitle}>Nog geen ritten</Text>
            <Text style={st.emptyText}>
              Druk op &ldquo;+ Rit starten&rdquo; om GPS-tracking te starten
            </Text>
          </View>
        ) : (
          <>
            {ritten.map((rit, i) => (
              <View key={rit.id} style={[st.card, i === 0 && st.cardFirst]}>
                <View style={st.cardTop}>
                  <Text style={st.cardDesc} numberOfLines={1}>{rit.description}</Text>
                  <Text style={st.cardKm}>{parseFloat(rit.distance_km).toFixed(1)} km</Text>
                </View>
                <View style={st.cardBot}>
                  <Text style={st.cardRoute} numberOfLines={1}>
                    {rit.start_address} → {rit.end_address}
                  </Text>
                  <View style={st.cardMeta}>
                    <Text style={st.cardDatum}>{formatDatum(rit.started_at)}</Text>
                    <Text style={st.cardTijd}>{formatTijd(rit.started_at)}</Text>
                    <View style={[st.badge, rit.is_business_trip ? st.badgeZ : st.badgeP]}>
                      <Text style={[st.badgeTxt, rit.is_business_trip ? st.badgeZtxt : st.badgePtxt]}>
                        {rit.is_business_trip ? 'Zakelijk' : 'Privé'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal: rit starten */}
      <Modal visible={toonStartModal} transparent animationType="none" onRequestClose={() => setToonStartModal(false)}>
        <KeyboardAvoidingView
          style={st.dialogWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setToonStartModal(false)} />
          <View style={st.dialog}>
            <Text style={st.dialogTitle}>Rit starten</Text>
            <Text style={st.inputLabel}>Waarheen / omschrijving</Text>
            <TextInput
              style={st.input}
              placeholder="Bijv. Bezoek klant Amsterdam"
              placeholderTextColor="#9ca3af"
              value={startOmschrijving}
              onChangeText={setStartOmschrijving}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={handleStart}
            />
            <TouchableOpacity
              style={[st.primaryBtn, (!startOmschrijving.trim() || isStarting) && st.disabled]}
              onPress={handleStart}
              disabled={!startOmschrijving.trim() || isStarting}
              activeOpacity={0.85}
            >
              {isStarting
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.primaryTxt}>📍  GPS-tracking starten</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={st.ghostBtn} onPress={() => setToonStartModal(false)}>
              <Text style={st.ghostTxt}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: rit opslaan */}
      <Modal visible={toonOpslaanModal} transparent animationType="none" onRequestClose={() => {}}>
        <KeyboardAvoidingView style={st.dialogWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={st.dialog}>
            <Text style={st.dialogTitle}>Rit opslaan</Text>

            {eindResultaat && (
              <View style={st.eindStats}>
                <View style={st.eindItem}>
                  <Text style={st.eindVal}>{eindResultaat.distanceKm.toFixed(2)} km</Text>
                  <Text style={st.eindLbl}>Afstand</Text>
                </View>
                <View style={st.eindSep} />
                <View style={st.eindItem}>
                  <Text style={st.eindVal}>{formatDuur(eindResultaat.duurSec)}</Text>
                  <Text style={st.eindLbl}>Duur</Text>
                </View>
              </View>
            )}

            <Text style={st.inputLabel}>Vertrekadres</Text>
            <TextInput
              style={st.input}
              placeholder="Bijv. Thuis, Utrecht"
              placeholderTextColor="#9ca3af"
              value={startAdres}
              onChangeText={setStartAdres}
            />

            <Text style={st.inputLabel}>Aankomstadres</Text>
            <TextInput
              style={st.input}
              placeholder="Bijv. Keizersgracht 1, Amsterdam"
              placeholderTextColor="#9ca3af"
              value={eindAdres}
              onChangeText={setEindAdres}
            />

            <TouchableOpacity
              style={[st.primaryBtn, isSaving && st.disabled]}
              onPress={handleOpslaan}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.primaryTxt}>Opslaan</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={st.ghostBtn}
              onPress={() => { setToonOpslaanModal(false); setEindResultaat(null) }}
            >
              <Text style={st.ghostTxt}>Weggooien</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const BLUE = '#2563eb'
const DARK = '#111827'
const GRAY = '#6b7280'
const LIGHT = '#f3f4f6'

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },

  // Actieve rit banner
  activeBanner: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
  liveLabel: { color: '#34d399', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  activeNaam: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 20 },
  statsRow: { flexDirection: 'row', marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statSep: { width: 1, backgroundColor: '#3b82f6', marginVertical: 4 },
  statVal: { color: '#fff', fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLbl: { color: '#93c5fd', fontSize: 12, marginTop: 2 },
  stopBtn: {
    backgroundColor: '#dc2626', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  stopTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  heading: { fontSize: 28, fontWeight: '800', color: DARK },
  subheading: { fontSize: 13, color: GRAY, marginTop: 2 },
  startBtn: {
    backgroundColor: BLUE, paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 10,
  },
  startTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Lege staat
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 6 },
  emptyText: { fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 20, maxWidth: 260 },

  // Rit kaart
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardFirst: { borderColor: '#dbeafe', backgroundColor: '#fafcff' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardDesc: { fontSize: 15, fontWeight: '600', color: DARK, flex: 1, marginRight: 8 },
  cardKm: { fontSize: 18, fontWeight: '800', color: BLUE },
  cardBot: { gap: 4 },
  cardRoute: { fontSize: 12, color: GRAY },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  cardDatum: { fontSize: 11, color: GRAY },
  cardTijd: { fontSize: 11, color: '#9ca3af' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeZ: { backgroundColor: '#dbeafe' },
  badgeP: { backgroundColor: LIGHT },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  badgeZtxt: { color: BLUE },
  badgePtxt: { color: GRAY },

  // Dialogs (gecentreerd)
  dialogWrap: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  dialog: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  dialogTitle: { fontSize: 20, fontWeight: '700', color: DARK, marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 15, color: DARK, marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  primaryBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  ghostTxt: { color: GRAY, fontWeight: '500', fontSize: 15 },

  // Eind stats
  eindStats: {
    flexDirection: 'row', backgroundColor: '#eff6ff', borderRadius: 14,
    padding: 16, marginBottom: 20,
  },
  eindItem: { flex: 1, alignItems: 'center' },
  eindSep: { width: 1, backgroundColor: '#bfdbfe', marginVertical: 4 },
  eindVal: { fontSize: 24, fontWeight: '800', color: '#1e40af' },
  eindLbl: { fontSize: 12, color: '#64748b', marginTop: 2 },

  disabled: { opacity: 0.5 },
})
