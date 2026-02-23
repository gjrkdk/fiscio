import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, Image, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { API_URL } from '../../lib/config'

type Bon = {
  id: string
  vendor: string | null
  amount: string | null
  vat_amount: string | null
  vat_rate: string | null
  category: string | null
  description: string | null
  receipt_date: string | null
  image_url: string | null
}

type BonForm = {
  vendor: string; amount: string; vatRate: string
  category: string; description: string; receiptDate: string
  imageUrl: string | null
}

const LEEG_FORM: BonForm = {
  vendor: '', amount: '', vatRate: '21',
  category: '', description: '',
  receiptDate: new Date().toISOString().split('T')[0]!,
  imageUrl: null,
}

const CATEGORIEËN = ['kantoor', 'reizen', 'software', 'maaltijden', 'abonnement', 'overig']
const BTW = ['0', '9', '21']

function euro(val: string | null) {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function KostenScreen() {
  const { session } = useAuth()
  const [bonnen, setBonnen] = useState<Bon[]>([])
  const [laden, setLaden] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<BonForm>(LEEG_FORM)
  const [preview, setPreview] = useState<string | null>(null)
  const [scannen, setScannen] = useState(false)
  const [opslaan, setOpslaan] = useState(false)

  const laadBonnen = useCallback(async () => {
    if (!session?.user) return
    const { data } = await supabase
      .from('receipts')
      .select('id,vendor,amount,vat_amount,vat_rate,category,description,receipt_date,image_url')
      .eq('user_id', session.user.id)
      .order('receipt_date', { ascending: false })
    if (data) setBonnen(data as Bon[])
    setLaden(false)
    setRefreshing(false)
  }, [session])

  useEffect(() => { laadBonnen() }, [laadBonnen])

  function openModal() {
    setForm(LEEG_FORM)
    setPreview(null)
    setModal(true)
  }

  async function kiesFoto(bron: 'camera' | 'gallery') {
    if (bron === 'camera') {
      const bestaand = await ImagePicker.getCameraPermissionsAsync()
      const perm = bestaand.granted
        ? bestaand
        : await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Geen cameratoegang', 'Ga naar Instellingen → Fiscio en zet Camera aan.')
        return
      }
    } else {
      const bestaand = await ImagePicker.getMediaLibraryPermissionsAsync()
      const perm = bestaand.granted
        ? bestaand
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Geen toegang tot foto\'s', 'Ga naar Instellingen → Fiscio en zet Foto\'s aan.')
        return
      }
    }

    const result = bron === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })

    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setPreview(asset.uri)
    await uploadEnOCR(asset.uri, asset.mimeType ?? 'image/jpeg')
  }

  async function uploadEnOCR(uri: string, mimeType: string) {
    if (!session?.user) return
    setScannen(true)
    try {
      // Bestand uploaden naar Supabase Storage
      const ext = mimeType.split('/')[1] ?? 'jpg'
      const pad = `${session.user.id}/${Date.now()}.${ext}`
      const blob = await (await fetch(uri)).blob()
      const { error } = await supabase.storage.from('receipts').upload(pad, blob, { contentType: mimeType })
      if (error) throw error
      setForm(f => ({ ...f, imageUrl: pad }))

      // OCR via web API
      const { data: { session: supaSession } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/api/mobile/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supaSession?.access_token}`,
        },
        body: JSON.stringify({ pad }),
      })
      const { ocr } = await res.json()
      if (ocr) {
        setForm(f => ({
          ...f,
          vendor: ocr.vendor ?? f.vendor,
          amount: ocr.amount ?? f.amount,
          vatRate: ocr.vatRate ?? f.vatRate,
          receiptDate: ocr.receiptDate ?? f.receiptDate,
          category: ocr.category ?? f.category,
          description: ocr.description ?? f.description,
          imageUrl: pad,
        }))
      }
    } catch (e) {
      Alert.alert('Upload mislukt', e instanceof Error ? e.message : 'Probeer opnieuw')
    } finally {
      setScannen(false)
    }
  }

  async function slaOp() {
    if (!form.vendor.trim() || !form.amount || !form.category) {
      Alert.alert('Vul leverancier, bedrag en categorie in')
      return
    }
    setOpslaan(true)
    const vatAmount = (parseFloat(form.amount) * parseFloat(form.vatRate) / 100).toFixed(2)
    const { error } = await supabase.from('receipts').insert({
      user_id: session!.user.id,
      vendor: form.vendor,
      amount: form.amount,
      vat_rate: form.vatRate,
      vat_amount: vatAmount,
      category: form.category,
      description: form.description || null,
      receipt_date: form.receiptDate,
      image_url: form.imageUrl,
    })
    if (error) { Alert.alert('Fout', error.message); setOpslaan(false); return }
    setModal(false)
    setOpslaan(false)
    await laadBonnen()
  }

  const totaalExcl = bonnen.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
  const totaalBtw = bonnen.reduce((s, b) => s + parseFloat(b.vat_amount ?? '0'), 0)

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); laadBonnen() }} />}
      >
        <View style={st.header}>
          <Text style={st.heading}>Kosten</Text>
          <TouchableOpacity style={st.addBtn} onPress={openModal}>
            <Text style={st.addTxt}>+ Bon</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {bonnen.length > 0 && (
          <View style={st.stats}>
            <View style={st.statItem}>
              <Text style={st.statLbl}>Excl. BTW</Text>
              <Text style={st.statVal}>{euro(totaalExcl.toString())}</Text>
            </View>
            <View style={st.statSep} />
            <View style={st.statItem}>
              <Text style={st.statLbl}>BTW</Text>
              <Text style={st.statVal}>{euro(totaalBtw.toString())}</Text>
            </View>
            <View style={st.statSep} />
            <View style={st.statItem}>
              <Text style={st.statLbl}>Incl. BTW</Text>
              <Text style={[st.statVal, { color: '#2563eb' }]}>{euro((totaalExcl + totaalBtw).toString())}</Text>
            </View>
          </View>
        )}

        {laden ? (
          <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />
        ) : bonnen.length === 0 ? (
          <View style={st.leeg}>
            <Text style={st.leegIcon}>🧾</Text>
            <Text style={st.leegTitel}>Nog geen bonnetjes</Text>
            <Text style={st.leegTxt}>Druk op "+ Bon" om een bonnetje toe te voegen</Text>
          </View>
        ) : (
          bonnen.map(b => {
            const excl = parseFloat(b.amount ?? '0')
            const btw = parseFloat(b.vat_amount ?? '0')
            return (
              <View key={b.id} style={st.kaart}>
                <View style={st.kaartTop}>
                  <Text style={st.vendor}>{b.vendor}</Text>
                  <Text style={st.bedrag}>{euro(b.amount)}</Text>
                </View>
                <View style={st.kaartBot}>
                  <View style={st.kaartMeta}>
                    {b.receipt_date && <Text style={st.datum}>{formatDatum(b.receipt_date)}</Text>}
                    {b.category && (
                      <View style={st.catBadge}>
                        <Text style={st.catTxt}>{b.category}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.btwTxt}>BTW {euro(b.vat_amount)} ({b.vat_rate}%)</Text>
                </View>
                {b.image_url && <Text style={st.fotoLabel}>📎 Foto bijgevoegd</Text>}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Bon toevoegen modal */}
      <Modal visible={modal} transparent animationType="none">
        <KeyboardAvoidingView style={st.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={st.modalCard}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitel}>Bon toevoegen</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={st.sluitBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Foto upload */}
              <View style={st.fotoZone}>
                {preview ? (
                  <View>
                    <Image source={{ uri: preview }} style={st.preview} resizeMode="cover" />
                    {scannen && (
                      <View style={st.scanOverlay}>
                        <ActivityIndicator color="#fff" />
                        <Text style={st.scanTxt}>AI scant bonnetje...</Text>
                      </View>
                    )}
                    {!scannen && (
                      <View style={st.fotoActies}>
                        <TouchableOpacity style={st.fotoBtnKlein} onPress={() => kiesFoto('camera')}>
                          <Text style={st.fotoBtnTxt}>📷 Opnieuw</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={st.fotoKnoppen}>
                    <TouchableOpacity style={st.fotoBtn} onPress={() => kiesFoto('camera')}>
                      <Text style={st.fotoBtnIcoon}>📷</Text>
                      <Text style={st.fotoBtnTxt}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.fotoBtn} onPress={() => kiesFoto('gallery')}>
                      <Text style={st.fotoBtnIcoon}>🖼</Text>
                      <Text style={st.fotoBtnTxt}>Galerij</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Velden */}
              {[
                { label: 'Leverancier *', key: 'vendor' as const, placeholder: 'Albert Heijn, NS...' },
                { label: 'Bedrag excl. BTW *', key: 'amount' as const, placeholder: '0.00', keyboard: 'decimal-pad' as const },
                { label: 'Datum', key: 'receiptDate' as const, placeholder: 'YYYY-MM-DD' },
                { label: 'Omschrijving', key: 'description' as const, placeholder: 'Optioneel' },
              ].map(({ label, key, placeholder, keyboard }) => (
                <View key={key} style={st.veldWrap}>
                  <Text style={st.veldLabel}>{label}</Text>
                  <TextInput
                    style={st.input}
                    value={form[key] ?? ''}
                    onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor="#9ca3af"
                    keyboardType={keyboard ?? 'default'}
                    autoCorrect={false}
                  />
                </View>
              ))}

              {/* BTW tarief */}
              <Text style={st.veldLabel}>BTW tarief</Text>
              <View style={st.chipRij}>
                {BTW.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[st.chip, form.vatRate === t && st.chipActief]}
                    onPress={() => setForm(f => ({ ...f, vatRate: t }))}
                  >
                    <Text style={[st.chipTxt, form.vatRate === t && st.chipTxtActief]}>{t}%</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Categorie */}
              <Text style={[st.veldLabel, { marginTop: 14 }]}>Categorie *</Text>
              <View style={st.chipRij}>
                {CATEGORIEËN.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[st.chip, form.category === c && st.chipActief]}
                    onPress={() => setForm(f => ({ ...f, category: c }))}
                  >
                    <Text style={[st.chipTxt, form.category === c && st.chipTxtActief]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* BTW preview */}
              {form.amount && !isNaN(+form.amount) && +form.amount > 0 && (
                <View style={st.btwPreview}>
                  <Text style={st.btwPreviewTxt}>
                    BTW: {euro((+form.amount * +form.vatRate / 100).toFixed(2))} · Incl: {euro((+form.amount * (1 + +form.vatRate / 100)).toFixed(2))}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[st.primaryBtn, (opslaan || scannen) && st.disabled]}
                onPress={slaOp}
                disabled={opslaan || scannen}
              >
                {opslaan ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryTxt}>Toevoegen</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const BLUE = '#2563eb'
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 28, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stats: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statSep: { width: 1, backgroundColor: '#e5e7eb' },
  statLbl: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  statVal: { fontSize: 15, fontWeight: '700', color: '#111827' },
  leeg: { alignItems: 'center', paddingTop: 60 },
  leegIcon: { fontSize: 40, marginBottom: 10 },
  leegTitel: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  leegTxt: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  kaart: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  kaartTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  vendor: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  bedrag: { fontSize: 16, fontWeight: '800', color: '#111827' },
  kaartBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kaartMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  datum: { fontSize: 12, color: '#9ca3af' },
  catBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  catTxt: { fontSize: 11, color: '#6b7280' },
  btwTxt: { fontSize: 11, color: '#9ca3af' },
  fotoLabel: { fontSize: 11, color: BLUE, marginTop: 6 },
  // Modal
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitel: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sluitBtn: { fontSize: 20, color: '#6b7280', padding: 4 },
  fotoZone: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  fotoKnoppen: { flexDirection: 'row', gap: 1 },
  fotoBtn: { flex: 1, paddingVertical: 20, alignItems: 'center', gap: 4 },
  fotoBtnIcoon: { fontSize: 24 },
  fotoBtnTxt: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  preview: { width: '100%', height: 140 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  scanTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },
  fotoActies: { padding: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  fotoBtnKlein: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  veldWrap: { marginBottom: 12 },
  veldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#fafafa',
  },
  chipRij: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: '#f3f4f6' },
  chipActief: { backgroundColor: BLUE },
  chipTxt: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipTxtActief: { color: '#fff', fontWeight: '700' },
  btwPreview: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginVertical: 10 },
  btwPreviewTxt: { fontSize: 12, color: '#1d4ed8', fontWeight: '500' },
  primaryBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 8,
  },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
})
