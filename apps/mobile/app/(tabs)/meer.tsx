import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type Profiel = {
  full_name: string
  company_name: string
  kvk_number: string
  btw_number: string
  iban: string
  address: string
  zip_code: string
  city: string
}

type Klant = {
  id: string
  name: string
  email: string | null
  address: string | null
  kvk_number: string | null
  btw_number: string | null
}

const LEEG: Profiel = {
  full_name: '', company_name: '', kvk_number: '',
  btw_number: '', iban: '', address: '', zip_code: '', city: '',
}

export default function MeerScreen() {
  const { session } = useAuth()
  const [tab, setTab] = useState<'instellingen' | 'klanten'>('instellingen')

  // Instellingen state
  const [profiel, setProfiel] = useState<Profiel>(LEEG)
  const [ladenProfiel, setLadenProfiel] = useState(true)
  const [opslaan, setOpslaan] = useState(false)

  // Klanten state
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [ladenKlanten, setLadenKlanten] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    laadProfiel()
  }, [session])

  useEffect(() => {
    if (tab === 'klanten' && session?.user) laadKlanten()
  }, [tab, session])

  async function laadProfiel() {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session!.user.id)
      .single()
    if (data) {
      setProfiel({
        full_name: data.full_name ?? '',
        company_name: data.company_name ?? '',
        kvk_number: data.kvk_number ?? '',
        btw_number: data.btw_number ?? '',
        iban: data.iban ?? '',
        address: data.address ?? '',
        zip_code: data.zip_code ?? '',
        city: data.city ?? '',
      })
    }
    setLadenProfiel(false)
  }

  async function laadKlanten() {
    setLadenKlanten(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('name')
    if (data) setKlanten(data as Klant[])
    setLadenKlanten(false)
  }

  async function slaProfielOp() {
    setOpslaan(true)
    const { error } = await supabase
      .from('users')
      .upsert({ id: session!.user.id, ...profiel, updated_at: new Date().toISOString() })
    if (error) Alert.alert('Fout', error.message)
    else Alert.alert('Opgeslagen ✓')
    setOpslaan(false)
  }

  async function handleLogout() {
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Uitloggen', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  function veld(label: string, key: keyof Profiel, opts?: { placeholder?: string; keyboard?: any }) {
    return (
      <View key={key} style={st.veldWrap}>
        <Text style={st.veldLabel}>{label}</Text>
        <TextInput
          style={st.input}
          value={profiel[key]}
          onChangeText={v => setProfiel(p => ({ ...p, [key]: v }))}
          placeholder={opts?.placeholder ?? ''}
          placeholderTextColor="#9ca3af"
          keyboardType={opts?.keyboard ?? 'default'}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      {/* Tabs */}
      <View style={st.tabBar}>
        {(['instellingen', 'klanten'] as const).map(t => (
          <TouchableOpacity key={t} style={[st.tabBtn, tab === t && st.tabActief]} onPress={() => setTab(t)}>
            <Text style={[st.tabTxt, tab === t && st.tabTxtActief]}>
              {t === 'instellingen' ? 'Instellingen' : 'Klanten'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'instellingen' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={st.scroll}>
            <Text style={st.heading}>Profiel</Text>
            {ladenProfiel ? <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} /> : (
              <>
                {veld('Volledige naam', 'full_name', { placeholder: 'Jan de Vries' })}
                {veld('Bedrijfsnaam', 'company_name', { placeholder: 'Mijn BV' })}
                {veld('KVK-nummer', 'kvk_number', { placeholder: '12345678', keyboard: 'numeric' })}
                {veld('BTW-nummer', 'btw_number', { placeholder: 'NL123456789B01' })}
                {veld('IBAN', 'iban', { placeholder: 'NL91ABNA0417164300' })}
                {veld('Adres', 'address', { placeholder: 'Hoofdstraat 1' })}
                <View style={st.rij}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.veldLabel}>Postcode</Text>
                    <TextInput
                      style={st.input}
                      value={profiel.zip_code}
                      onChangeText={v => setProfiel(p => ({ ...p, zip_code: v }))}
                      placeholder="1234 AB"
                      placeholderTextColor="#9ca3af"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={{ flex: 2, marginLeft: 10 }}>
                    <Text style={st.veldLabel}>Stad</Text>
                    <TextInput
                      style={st.input}
                      value={profiel.city}
                      onChangeText={v => setProfiel(p => ({ ...p, city: v }))}
                      placeholder="Amsterdam"
                      placeholderTextColor="#9ca3af"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[st.primaryBtn, opslaan && st.disabled]}
                  onPress={slaProfielOp}
                  disabled={opslaan}
                >
                  {opslaan
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={st.primaryTxt}>Opslaan</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={st.logoutBtn} onPress={handleLogout}>
                  <Text style={st.logoutTxt}>Uitloggen</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={st.scroll}>
          <Text style={st.heading}>Klanten</Text>
          {ladenKlanten ? (
            <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />
          ) : klanten.length === 0 ? (
            <View style={st.leeg}>
              <Text style={st.leegIcon}>🏢</Text>
              <Text style={st.leegTitel}>Geen klanten</Text>
              <Text style={st.leegTxt}>Voeg klanten toe via de webapp</Text>
            </View>
          ) : (
            klanten.map(k => (
              <View key={k.id} style={st.klantKaart}>
                <Text style={st.klantNaam}>{k.name}</Text>
                {k.email && <Text style={st.klantDetail}>{k.email}</Text>}
                {k.address && <Text style={st.klantDetail}>{k.address}</Text>}
                <View style={st.klantMeta}>
                  {k.kvk_number && <Text style={st.klantBadge}>KVK: {k.kvk_number}</Text>}
                  {k.btw_number && <Text style={st.klantBadge}>BTW: {k.btw_number}</Text>}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const BLUE = '#2563eb'
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActief: { borderBottomColor: BLUE },
  tabTxt: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTxtActief: { color: BLUE, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  veldWrap: { marginBottom: 14 },
  veldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },
  rij: { flexDirection: 'row', marginBottom: 14 },
  primaryBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  logoutBtn: { paddingVertical: 14, alignItems: 'center' },
  logoutTxt: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  leeg: { alignItems: 'center', paddingTop: 60 },
  leegIcon: { fontSize: 40, marginBottom: 10 },
  leegTitel: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  leegTxt: { fontSize: 13, color: '#9ca3af' },
  klantKaart: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  klantNaam: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  klantDetail: { fontSize: 13, color: '#6b7280', marginBottom: 1 },
  klantMeta: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  klantBadge: {
    fontSize: 11, color: '#2563eb', backgroundColor: '#dbeafe',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
  },
})
