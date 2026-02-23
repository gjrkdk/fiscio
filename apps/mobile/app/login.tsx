import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register'

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [laden, setLaden] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !wachtwoord.trim()) {
      Alert.alert('Vul je e-mailadres en wachtwoord in')
      return
    }
    setLaden(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: wachtwoord,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: wachtwoord,
        })
        if (error) throw error
        Alert.alert('Account aangemaakt', 'Controleer je e-mail om je account te bevestigen.')
      }
    } catch (e: any) {
      Alert.alert('Fout', e?.message ?? 'Er ging iets mis')
    } finally {
      setLaden(false)
    }
  }

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo / merk */}
          <View style={st.top}>
            <View style={st.logo}>
              <Text style={st.logoTxt}>F</Text>
            </View>
            <Text style={st.appNaam}>Fiscio</Text>
            <Text style={st.tagline}>Slimme administratie voor ZZP'ers</Text>
          </View>

          {/* Formulier */}
          <View style={st.card}>
            {/* Tab switcher */}
            <View style={st.tabs}>
              <TouchableOpacity
                style={[st.tab, mode === 'login' && st.tabActief]}
                onPress={() => setMode('login')}
              >
                <Text style={[st.tabTxt, mode === 'login' && st.tabTxtActief]}>Inloggen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.tab, mode === 'register' && st.tabActief]}
                onPress={() => setMode('register')}
              >
                <Text style={[st.tabTxt, mode === 'register' && st.tabTxtActief]}>Registreren</Text>
              </TouchableOpacity>
            </View>

            <Text style={st.label}>E-mailadres</Text>
            <TextInput
              style={st.input}
              placeholder="jij@voorbeeld.nl"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={st.label}>Wachtwoord</Text>
            <TextInput
              style={st.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={wachtwoord}
              onChangeText={setWachtwoord}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={[st.btn, laden && st.btnDisabled]}
              onPress={handleSubmit}
              disabled={laden}
              activeOpacity={0.85}
            >
              {laden
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.btnTxt}>{mode === 'login' ? 'Inloggen' : 'Account aanmaken'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const BLUE = '#2563eb'

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  // Logo
  top: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  logoTxt: { color: '#fff', fontSize: 28, fontWeight: '800' },
  appNaam: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#6b7280' },

  // Kaart
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderRadius: 10, padding: 3, marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActief: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabTxt: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTxtActief: { color: '#111827', fontWeight: '700' },

  // Velden
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#111827',
    marginBottom: 16, backgroundColor: '#fafafa',
  },

  // Knop
  btn: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
