import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

const stijlen = StyleSheet.create({
  pagina: { fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937', padding: 48, backgroundColor: '#fff' },
  koptekst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  logo: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  koprechts: { textAlign: 'right', color: '#6b7280', fontSize: 9 },
  titel: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  subtitel: { fontSize: 10, color: '#6b7280', marginBottom: 24 },
  sectie: { marginBottom: 20 },
  sectieTitel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #e5e7eb' },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiKaart: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 6, padding: 12, border: '1px solid #e5e7eb' },
  kpiLabel: { fontSize: 8, color: '#6b7280', marginBottom: 3, textTransform: 'uppercase' },
  kpiWaarde: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827' },
  kpiGroen: { color: '#059669' },
  kpiRood: { color: '#dc2626' },
  tabelKop: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 4, padding: '6 8', marginBottom: 2 },
  tabelRij: { flexDirection: 'row', padding: '5 8', borderBottom: '0.5px solid #f3f4f6' },
  tabelRijTotaal: { flexDirection: 'row', padding: '6 8', backgroundColor: '#eff6ff', borderRadius: 4, marginTop: 2 },
  cel: { flex: 1, fontSize: 9, color: '#374151' },
  celBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  celRechts: { flex: 1, fontSize: 9, color: '#374151', textAlign: 'right' },
  celRechtsBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right' },
  celGroen: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#059669', textAlign: 'right' },
  celRood: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#dc2626', textAlign: 'right' },
  voettekst: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af', borderTop: '0.5px solid #e5e7eb', paddingTop: 8 },
  scheidslijn: { borderBottom: '1px solid #e5e7eb', marginBottom: 20 },
})

const euro = (n: number) => `€ ${Math.round(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']

type Maanddata = { omzet: number; kosten: number; btw: number }

interface Props {
  jaar: number
  bedrijfsnaam: string
  omzet: number
  kosten: number
  winst: number
  btw: number
  kmZakelijk: number
  factuurAantal: number
  openstaand: number
  perMaand: Maanddata[]
  kostenPerCat: Record<string, number>
  kwartalen: { omzet: number; kosten: number; winst: number; btw: number }[]
}

export function JaaroverzichtPDF({ jaar, bedrijfsnaam, omzet, kosten, winst, btw, kmZakelijk, factuurAantal, openstaand, perMaand, kostenPerCat, kwartalen }: Props) {
  const vandaag = new Date().toLocaleDateString('nl-NL')
  const kwijtscheldingsaftrek = Math.round(winst * 0.127)
  const zelfstandigenaftrek = 3750

  return (
    <Document title={`Fiscio Jaaroverzicht ${jaar}`} author={bedrijfsnaam}>
      <Page size="A4" style={stijlen.pagina}>

        {/* Koptekst */}
        <View style={stijlen.koptekst}>
          <View>
            <Text style={stijlen.logo}>Fiscio</Text>
            <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>AI-native boekhouding voor ZZP'ers</Text>
          </View>
          <View style={stijlen.koprechts}>
            <Text>Gegenereerd op {vandaag}</Text>
            <Text>{bedrijfsnaam}</Text>
          </View>
        </View>

        {/* Titel */}
        <Text style={stijlen.titel}>Financieel Jaaroverzicht {jaar}</Text>
        <Text style={stijlen.subtitel}>Indicatief overzicht op basis van geregistreerde gegevens in Fiscio</Text>

        {/* KPI kaarten */}
        <View style={stijlen.kpiGrid}>
          <View style={stijlen.kpiKaart}>
            <Text style={stijlen.kpiLabel}>Omzet</Text>
            <Text style={stijlen.kpiWaarde}>{euro(omzet)}</Text>
          </View>
          <View style={stijlen.kpiKaart}>
            <Text style={stijlen.kpiLabel}>Kosten</Text>
            <Text style={[stijlen.kpiWaarde, stijlen.kpiRood]}>{euro(kosten)}</Text>
          </View>
          <View style={stijlen.kpiKaart}>
            <Text style={stijlen.kpiLabel}>Nettowinst</Text>
            <Text style={[stijlen.kpiWaarde, winst >= 0 ? stijlen.kpiGroen : stijlen.kpiRood]}>{euro(winst)}</Text>
          </View>
          <View style={stijlen.kpiKaart}>
            <Text style={stijlen.kpiLabel}>BTW afdracht</Text>
            <Text style={stijlen.kpiWaarde}>{euro(btw)}</Text>
          </View>
        </View>

        {/* Kwartaaloverzicht */}
        <View style={stijlen.sectie}>
          <Text style={stijlen.sectieTitel}>Kwartaaloverzicht</Text>
          <View style={stijlen.tabelKop}>
            <Text style={stijlen.celBold}>Kwartaal</Text>
            <Text style={stijlen.celRechtsBold}>Omzet</Text>
            <Text style={stijlen.celRechtsBold}>Kosten</Text>
            <Text style={stijlen.celRechtsBold}>Winst</Text>
            <Text style={stijlen.celRechtsBold}>BTW</Text>
          </View>
          {kwartalen.map((kw, i) => (
            <View key={i} style={stijlen.tabelRij}>
              <Text style={stijlen.cel}>Q{i + 1}</Text>
              <Text style={stijlen.celRechts}>{euro(kw.omzet)}</Text>
              <Text style={stijlen.celRechts}>{euro(kw.kosten)}</Text>
              <Text style={kw.winst >= 0 ? stijlen.celGroen : stijlen.celRood}>{euro(kw.winst)}</Text>
              <Text style={stijlen.celRechts}>{euro(kw.btw)}</Text>
            </View>
          ))}
          <View style={stijlen.tabelRijTotaal}>
            <Text style={stijlen.celBold}>Totaal {jaar}</Text>
            <Text style={stijlen.celRechtsBold}>{euro(omzet)}</Text>
            <Text style={stijlen.celRechtsBold}>{euro(kosten)}</Text>
            <Text style={winst >= 0 ? stijlen.celGroen : stijlen.celRood}>{euro(winst)}</Text>
            <Text style={stijlen.celRechtsBold}>{euro(btw)}</Text>
          </View>
        </View>

        {/* Kosten per categorie */}
        {Object.keys(kostenPerCat).length > 0 && (
          <View style={stijlen.sectie}>
            <Text style={stijlen.sectieTitel}>Kosten per categorie</Text>
            <View style={stijlen.tabelKop}>
              <Text style={stijlen.celBold}>Categorie</Text>
              <Text style={stijlen.celRechtsBold}>Bedrag</Text>
              <Text style={stijlen.celRechtsBold}>% van totaal</Text>
            </View>
            {Object.entries(kostenPerCat).sort((a, b) => b[1] - a[1]).map(([cat, bedrag_]) => (
              <View key={cat} style={stijlen.tabelRij}>
                <Text style={stijlen.cel}>{cat}</Text>
                <Text style={stijlen.celRechts}>{euro(bedrag_)}</Text>
                <Text style={stijlen.celRechts}>{kosten > 0 ? Math.round((bedrag_ / kosten) * 100) : 0}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Belastingschatting */}
        <View style={stijlen.sectie}>
          <Text style={stijlen.sectieTitel}>Belastingschatting (indicatief)</Text>
          <View style={stijlen.tabelRij}>
            <Text style={stijlen.cel}>Nettowinst</Text>
            <Text style={stijlen.celRechts}>{euro(winst)}</Text>
          </View>
          <View style={stijlen.tabelRij}>
            <Text style={stijlen.cel}>Zelfstandigenaftrek (2024)</Text>
            <Text style={stijlen.celRood}>- {euro(Math.min(zelfstandigenaftrek, winst))}</Text>
          </View>
          <View style={stijlen.tabelRij}>
            <Text style={stijlen.cel}>MKB-winstvrijstelling (12,7%)</Text>
            <Text style={stijlen.celRood}>- {euro(kwijtscheldingsaftrek)}</Text>
          </View>
          <View style={stijlen.tabelRijTotaal}>
            <Text style={stijlen.celBold}>Belastbaar inkomen (schatting)</Text>
            <Text style={stijlen.celRechtsBold}>{euro(Math.max(0, winst - zelfstandigenaftrek - kwijtscheldingsaftrek))}</Text>
          </View>
        </View>

        {/* Extra info */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={[stijlen.kpiKaart, { flex: 1 }]}>
            <Text style={stijlen.kpiLabel}>Zakelijke km</Text>
            <Text style={stijlen.kpiWaarde}>{Math.round(kmZakelijk).toLocaleString('nl-NL')} km</Text>
            <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>Vergoeding: {euro(kmZakelijk * 0.23)}</Text>
          </View>
          <View style={[stijlen.kpiKaart, { flex: 1 }]}>
            <Text style={stijlen.kpiLabel}>Facturen</Text>
            <Text style={stijlen.kpiWaarde}>{factuurAantal} stuks</Text>
            <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>Openstaand: {euro(openstaand)}</Text>
          </View>
        </View>

        {/* Voettekst */}
        <View style={stijlen.voettekst} fixed>
          <Text>Fiscio · fiscio.vercel.app · Indicatief overzicht, geen officieel belastingadvies</Text>
          <Text>Pagina 1 van 1</Text>
        </View>
      </Page>
    </Document>
  )
}
