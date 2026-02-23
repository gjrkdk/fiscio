import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Alert, ActivityIndicator, Modal, ScrollView,
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
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RittenScreen() {
  const [isActief, setIsActief] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ritten, setRitten] = useState<Rit[]>([])
  const [ladenRitten, setLadenRitten] = useState(true)

  // Live tracking stats
  const [duurSec, setDuurSec] = useState(0)
  const [liveKm, setLiveKm] = useState(0)
  const [startTijd, setStartTijd] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const coordsRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rit opslaan modal
  const [toonOpslaanModal, setToonOpslaanModal] = useState(false)
  const [eindResultaat, setEindResultaat] = useState<{ distanceKm: number; duurSec: number } | null>(null)
  const [omschrijving, setOmschrijving] = useState('')
  const [startAdres, setStartAdres] = useState('')
  const [eindAdres, setEindAdres] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Nieuw rit modal
  const [toonStartModal, setToonStartModal] = useState(false)
  const [startOmschrijving, setStartOmschrijving] = useState('')

  const laadRitten = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(50)
    if (data) setRitten(data as Rit[])
    setLadenRitten(false)
  }, [])

  // Controleer bij opstarten of er al een rit loopt
  useEffect(() => {
    const init = async () => {
      const actief = await isTrackingActief()
      setIsActief(actief)
      if (actief) {
        const meta = await getActiveMeta()
        if (meta) {
          const start = new Date(meta.startedAt)
          setStartTijd(start)
          setOmschrijving(meta.description)
          setDuurSec(Math.floor((Date.now() - start.getTime()) / 1000))
        }
      }
    }
    init()
    laadRitten()
  }, [laadRitten])

  // Timer + live km update
  useEffect(() => {
    if (isActief) {
      timerRef.current = setInterval(() => {
        setDuurSec(prev => prev + 1)
      }, 1000)

      coordsRef.current = setInterval(async () => {
        const coords = await getLiveCoords()
        setLiveKm(berekenTotaalKm(coords))
      }, 3000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (coordsRef.current) clearInterval(coordsRef.current)
      setDuurSec(0)
      setLiveKm(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (coordsRef.current) clearInterval(coordsRef.current)
    }
  }, [isActief])

  async function handleStart() {
    if (!startOmschrijving.trim()) {
      Alert.alert('Omschrijving', 'Vul een omschrijving in, bijv. "Bezoek klant Amsterdam"')
      return
    }
    setIsLoading(true)
    try {
      await startTracking(startOmschrijving)
      setStartTijd(new Date())
      setDuurSec(0)
      setLiveKm(0)
      setOmschrijving(startOmschrijving)
      setIsActief(true)
      setToonStartModal(false)
      setStartOmschrijving('')
    } catch (e) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Starten mislukt')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStop() {
    setIsLoading(true)
    try {
      const resultaat = await stopTracking()
      if (!resultaat) { setIsLoading(false); return }
      setIsActief(false)
      setEindResultaat({ distanceKm: resultaat.distanceKm, duurSec: resultaat.duurSec })
      setToonOpslaanModal(true)
    } catch (e) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Stoppen mislukt')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOpslaanRit() {
    if (!eindResultaat) return
    setIsSaving(true)
    try {
      const meta = await getActiveMeta() ?? { startedAt: startTijd?.toISOString() ?? new Date().toISOString(), description: omschrijving }
      await slaRitOp(
        meta,
        eindResultaat.distanceKm,
        new Date(),
        startAdres || 'Onbekend vertrek',
        eindAdres || 'Onbekend aankomst',
      )
      setToonOpslaanModal(false)
      setStartAdres(''); setEindAdres(''); setEindResultaat(null)
      await laadRitten()
    } catch (e) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SafeAreaView style={st.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.scroll}>
        {/* Header */}
        <View style={st.header}>
          <Text style={st.heading}>Ritten</Text>
          {!isActief && (
            <TouchableOpacity style={st.startBtn} onPress={() => setToonStartModal(true)}>
              <Text style={st.startBtnText}>+ Rit starten</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actieve rit kaart */}
        {isActief && (
          <View style={st.actieveRit}>
            <View style={st.actieveRitHeader}>
              <View style={st.liveIndicator}>
                <View style={st.liveDot} />
                <Text style={st.liveTekst}>LIVE</Text>
              </View>
              <Text style={st.ritNaam} numberOfLines={1}>{omschrijving}</Text>
            </View>

            <View style={st.statsRij}>
              <View style={st.statBlok}>
                <Text style={st.statWaarde}>{formatDuur(duurSec)}</Text>
                <Text style={st.statLabel}>Tijd</Text>
              </View>
              <View style={[st.statBlok, st.statDivider]}>
                <Text style={st.statWaarde}>{liveKm.toFixed(2)}</Text>
                <Text style={st.statLabel}>Kilometer</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[st.stopBtn, isLoading && st.btnDisabled]}
              onPress={handleStop}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.stopBtnText}>⬛ Stop rit</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Ritten lijst */}
        <Text style={st.lijstTitel}>Recente ritten</Text>

        {ladenRitten ? (
          <ActivityIndicator style={{ marginTop: 32 }} color="#2563eb" />
        ) : ritten.length === 0 ? (
          <View style={st.leeg}>
            <Text style={st.leegIcon}>🚗</Text>
            <Text style={st.leegTitel}>Nog geen ritten</Text>
            <Text style={st.leegTekst}>Start je eerste rit met de knop hierboven</Text>
          </View>
        ) : (
          ritten.map(rit => (
            <View key={rit.id} style={st.ritKaart}>
              <View style={st.ritLinks}>
                <Text style={st.ritOmschrijving} numberOfLines={1}>{rit.description}</Text>
                <Text style={st.ritAdres} numberOfLines={1}>
                  {rit.start_address} → {rit.end_address}
                </Text>
                <Text style={st.ritDatum}>{formatDatum(rit.started_at)}</Text>
              </View>
              <View style={st.ritRechts}>
                <Text style={st.ritKm}>{parseFloat(rit.distance_km).toFixed(1)} km</Text>
                <View style={[st.badge, rit.is_business_trip ? st.badgeZakelijk : st.badgePrive]}>
                  <Text style={st.badgeTekst}>{rit.is_business_trip ? 'Zakelijk' : 'Privé'}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Rit starten modal */}
      <Modal visible={toonStartModal} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalBox}>
            <Text style={st.modalTitel}>Rit starten</Text>

            <Text style={st.inputLabel}>Omschrijving</Text>
            <TextInput
              style={st.input}
              placeholder="Bijv. Bezoek klant Amsterdam"
              value={startOmschrijving}
              onChangeText={setStartOmschrijving}
              autoFocus
            />

            <View style={st.modalKnoppen}>
              <TouchableOpacity style={st.annuleerBtn} onPress={() => setToonStartModal(false)}>
                <Text style={st.annuleerTekst}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.bevestigenBtn, isLoading && st.btnDisabled]}
                onPress={handleStart}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={st.bevestigenTekst}>GPS starten</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rit opslaan modal */}
      <Modal visible={toonOpslaanModal} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalBox}>
            <Text style={st.modalTitel}>Rit opslaan</Text>

            {eindResultaat && (
              <View style={st.eindStats}>
                <View style={st.eindStatBlok}>
                  <Text style={st.eindStatWaarde}>{eindResultaat.distanceKm.toFixed(2)} km</Text>
                  <Text style={st.eindStatLabel}>Afstand</Text>
                </View>
                <View style={st.eindStatBlok}>
                  <Text style={st.eindStatWaarde}>{formatDuur(eindResultaat.duurSec)}</Text>
                  <Text style={st.eindStatLabel}>Duur</Text>
                </View>
              </View>
            )}

            <Text style={st.inputLabel}>Vertrekadres</Text>
            <TextInput
              style={st.input}
              placeholder="Bijv. Hoofdstraat 1, Utrecht"
              value={startAdres}
              onChangeText={setStartAdres}
            />

            <Text style={st.inputLabel}>Aankomstadres</Text>
            <TextInput
              style={st.input}
              placeholder="Bijv. Keizersgracht 1, Amsterdam"
              value={eindAdres}
              onChangeText={setEindAdres}
            />

            <View style={st.modalKnoppen}>
              <TouchableOpacity
                style={st.annuleerBtn}
                onPress={() => { setToonOpslaanModal(false); setEindResultaat(null) }}
              >
                <Text style={st.annuleerTekst}>Weggooien</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.bevestigenBtn, isSaving && st.btnDisabled]}
                onPress={handleOpslaanRit}
                disabled={isSaving}
              >
                {isSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={st.bevestigenTekst}>Opslaan</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
  startBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Actieve rit
  actieveRit: { backgroundColor: '#1e40af', borderRadius: 16, padding: 20, marginBottom: 24 },
  actieveRitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
  liveTekst: { color: '#34d399', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  ritNaam: { color: '#bfdbfe', fontSize: 14, flex: 1 },
  statsRij: { flexDirection: 'row', marginBottom: 20 },
  statBlok: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: '#3b82f6' },
  statWaarde: { color: '#fff', fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: '#93c5fd', fontSize: 12, marginTop: 2 },
  stopBtn: { backgroundColor: '#dc2626', borderRadius: 10, padding: 14, alignItems: 'center' },
  stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },

  // Lijst
  lijstTitel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  leeg: { alignItems: 'center', paddingVertical: 40 },
  leegIcon: { fontSize: 40, marginBottom: 8 },
  leegTitel: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  leegTekst: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  ritKaart: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  ritLinks: { flex: 1, marginRight: 12 },
  ritOmschrijving: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  ritAdres: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  ritDatum: { fontSize: 11, color: '#9ca3af' },
  ritRechts: { alignItems: 'flex-end', gap: 4 },
  ritKm: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeZakelijk: { backgroundColor: '#dbeafe' },
  badgePrive: { backgroundColor: '#f3f4f6' },
  badgeTekst: { fontSize: 11, fontWeight: '600', color: '#374151' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitel: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111827', marginBottom: 16, backgroundColor: '#f9fafb',
  },
  modalKnoppen: { flexDirection: 'row', gap: 12, marginTop: 8 },
  annuleerBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, alignItems: 'center' },
  annuleerTekst: { color: '#374151', fontWeight: '600' },
  bevestigenBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  bevestigenTekst: { color: '#fff', fontWeight: '700' },

  // Eind stats
  eindStats: { flexDirection: 'row', backgroundColor: '#f0f9ff', borderRadius: 12, padding: 16, marginBottom: 20 },
  eindStatBlok: { flex: 1, alignItems: 'center' },
  eindStatWaarde: { fontSize: 22, fontWeight: '700', color: '#1e40af' },
  eindStatLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
