import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { Invoice, User, InvoiceLineItem } from '@fiscio/db'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 36 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  label: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  invoiceTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#2563eb', textAlign: 'right' },
  invoiceNumber: { fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 2 },
  clientBox: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 4, marginBottom: 28 },
  clientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#e5e7eb', paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  colDesc: { flex: 4 },
  colNum: { flex: 1, textAlign: 'right' },
  colMono: { flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica' },
  headerText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  totalsContainer: { marginTop: 16, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  totalsLabel: { width: 150, textAlign: 'right', color: '#6b7280', paddingRight: 12 },
  totalsValue: { width: 80, textAlign: 'right', fontFamily: 'Helvetica' },
  totalsBold: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  divider: { borderTopWidth: 1.5, borderTopColor: '#e5e7eb', marginVertical: 4 },
  paymentInfo: { marginTop: 32, padding: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', color: '#6b7280', fontSize: 9 },
  notes: { marginTop: 16, color: '#6b7280' },
})

function euro(n: number | string | null | undefined) {
  const num = typeof n === 'number' ? n : parseFloat(n ?? '0')
  return isNaN(num) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(num)
}

function fmt(d: Date | string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
}

type Props = {
  factuur: Invoice & { lineItems: InvoiceLineItem[] }
  profiel: User | null
}

export function FactuurPDF({ factuur, profiel }: Props) {
  return (
    <Document title={`Factuur ${factuur.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>
              {profiel?.companyName ?? profiel?.fullName ?? 'Jouw bedrijf'}
            </Text>
            {profiel?.address && <Text>{profiel.address}</Text>}
            {profiel?.zipCode && <Text>{profiel.zipCode} {profiel.city}</Text>}
            {profiel?.kvkNumber && <Text style={{ color: '#6b7280', marginTop: 4 }}>KVK: {profiel.kvkNumber}</Text>}
            {profiel?.btwNumber && <Text style={{ color: '#6b7280' }}>BTW: {profiel.btwNumber}</Text>}
            {profiel?.iban && <Text style={{ color: '#6b7280' }}>IBAN: {profiel.iban}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FACTUUR</Text>
            <Text style={styles.invoiceNumber}>{factuur.invoiceNumber}</Text>
            <Text style={{ textAlign: 'right', color: '#6b7280', marginTop: 8 }}>Datum: {fmt(factuur.createdAt)}</Text>
            <Text style={{ textAlign: 'right', color: '#6b7280' }}>Vervaldatum: {fmt(factuur.dueDate)}</Text>
          </View>
        </View>

        {/* Klant */}
        <View style={styles.clientBox}>
          <Text style={styles.label}>Factuur aan</Text>
          <Text style={styles.clientName}>{factuur.clientName}</Text>
          {factuur.clientAddress && <Text style={{ color: '#4b5563' }}>{factuur.clientAddress}</Text>}
          {factuur.clientEmail && <Text style={{ color: '#4b5563' }}>{factuur.clientEmail}</Text>}
          {factuur.clientKvk && <Text style={{ color: '#9ca3af', marginTop: 2 }}>KVK: {factuur.clientKvk}</Text>}
          {factuur.clientBtw && <Text style={{ color: '#9ca3af' }}>BTW: {factuur.clientBtw}</Text>}
        </View>

        {/* Tabel */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.headerText]}>Omschrijving</Text>
          <Text style={[styles.colNum, styles.headerText]}>Aantal</Text>
          <Text style={[styles.colNum, styles.headerText]}>Eenh.</Text>
          <Text style={[styles.colMono, styles.headerText]}>Tarief</Text>
          <Text style={[styles.colNum, styles.headerText]}>BTW</Text>
          <Text style={[styles.colMono, styles.headerText]}>Totaal</Text>
        </View>

        {factuur.lineItems.map((item, i) => {
          const lineTotal = item.quantity * item.unitPrice
          return (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colNum}>{item.quantity}</Text>
              <Text style={styles.colNum}>{item.unit ?? 'stuk'}</Text>
              <Text style={styles.colMono}>{euro(item.unitPrice)}</Text>
              <Text style={styles.colNum}>{item.vatRate}%</Text>
              <Text style={[styles.colMono, { fontFamily: 'Helvetica-Bold' }]}>{euro(lineTotal)}</Text>
            </View>
          )
        })}

        {/* Totalen */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotaal excl. BTW</Text>
            <Text style={styles.totalsValue}>{euro(factuur.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>BTW</Text>
            <Text style={styles.totalsValue}>{euro(factuur.vatAmount)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.totalsBold]}>Totaal incl. BTW</Text>
            <Text style={[styles.totalsValue, styles.totalsBold]}>{euro(factuur.total)}</Text>
          </View>
        </View>

        {/* Notities */}
        {factuur.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>Notities</Text>
            <Text>{factuur.notes}</Text>
          </View>
        )}

        {/* Betaalinfo */}
        {profiel?.iban && (
          <View style={styles.paymentInfo}>
            <Text>
              Gelieve te betalen voor {fmt(factuur.dueDate)} op rekeningnummer {profiel.iban}{'\n'}
              o.v.v. factuurnummer {factuur.invoiceNumber}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
