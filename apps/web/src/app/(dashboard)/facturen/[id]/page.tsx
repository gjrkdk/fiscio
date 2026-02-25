import type React from 'react'
import { eq, and } from 'drizzle-orm'
import { invoices, users } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '../StatusBadge'
import { FactuurActies } from './FactuurActies'
import type { InvoiceLineItem } from '@fiscio/db'

function euro(val: string | number | null | undefined) {
  const n = typeof val === 'number' ? val : parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default async function FactuurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
    .limit(1)

  if (!factuur) notFound()

  const [profiel] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const datum = factuur.createdAt
    ? new Date(factuur.createdAt).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-'
  const verval = factuur.dueDate
    ? new Date(factuur.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-'

  const lineItems = (factuur.lineItems ?? []) as InvoiceLineItem[]

  const divider = { borderTop: '1px solid oklch(0.93 0.005 255)', paddingTop: '1.5rem', marginTop: '1.5rem' }
  const labelSmall: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.65 0.01 255)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }
  const textMuted: React.CSSProperties = { fontSize: '0.875rem', color: 'oklch(0.50 0.015 255)', margin: '0.125rem 0 0' }

  return (
    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/facturen" style={{ fontSize: '0.875rem', color: 'oklch(0.60 0.01 255)', textDecoration: 'none' }}>← Facturen</Link>
          <StatusBadge status={factuur.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <a href={`/api/facturen/${factuur.id}/pdf`} target="_blank" style={{
            padding: '0.5rem 1rem', border: '1.5px solid oklch(0.88 0.01 255)', color: 'oklch(0.35 0.02 255)',
            fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.625rem', textDecoration: 'none', background: 'white',
          }}>
            ↓ PDF
          </a>
          <FactuurActies factuurId={factuur.id} status={factuur.status} clientEmail={factuur.clientEmail} reminderSentAt={factuur.reminderSentAt} />
        </div>
      </div>

      {/* Factuur preview kaart */}
      <div style={{ background: 'white', borderRadius: '1.25rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 2px 12px oklch(0 0 0 / 0.06)', padding: '2.5rem' }}>

        {/* Kop: afzender + factuurinfo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', margin: 0 }}>
              {profiel?.companyName ?? profiel?.fullName ?? 'Jouw bedrijf'}
            </p>
            {profiel?.address && <p style={textMuted}>{profiel.address}</p>}
            {profiel?.zipCode && <p style={textMuted}>{profiel.zipCode} {profiel.city}</p>}
            {profiel?.kvkNumber && <p style={{ ...textMuted, marginTop: '0.5rem' }}>KVK: {profiel.kvkNumber}</p>}
            {profiel?.btwNumber && <p style={textMuted}>BTW: {profiel.btwNumber}</p>}
            {profiel?.iban && <p style={textMuted}>IBAN: {profiel.iban}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'oklch(0.52 0.21 255)', margin: 0, letterSpacing: '0.05em' }}>FACTUUR</p>
            <p style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'oklch(0.28 0.02 255)', margin: '0.375rem 0 0' }}>{factuur.invoiceNumber}</p>
            <p style={{ ...textMuted, marginTop: '0.75rem' }}>Datum: {datum}</p>
            <p style={textMuted}>Vervaldatum: {verval}</p>
          </div>
        </div>

        {/* Klantblok */}
        <div style={{ background: 'oklch(0.97 0.003 255)', borderRadius: '0.75rem', padding: '1.125rem 1.25rem', marginBottom: '2rem', border: '1px solid oklch(0.93 0.005 255)' }}>
          <p style={labelSmall}>Factuur aan</p>
          <p style={{ fontWeight: 700, color: 'oklch(0.20 0.02 255)', margin: 0, fontSize: '0.95rem' }}>{factuur.clientName}</p>
          {factuur.clientAddress && <p style={textMuted}>{factuur.clientAddress}</p>}
          {factuur.clientEmail && <p style={textMuted}>{factuur.clientEmail}</p>}
          {factuur.clientKvk && <p style={textMuted}>KVK: {factuur.clientKvk}</p>}
          {factuur.clientBtw && <p style={textMuted}>BTW: {factuur.clientBtw}</p>}
        </div>

        {/* Regelitems tabel */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid oklch(0.91 0.01 255)' }}>
              {[
                { label: 'Omschrijving', align: 'left' },
                { label: 'Aantal', align: 'right' },
                { label: 'Eenh.', align: 'left' },
                { label: 'Tarief', align: 'right' },
                { label: 'BTW', align: 'right' },
                { label: 'Totaal', align: 'right' },
              ].map(h => (
                <th key={h.label} style={{ padding: '0.625rem 0.5rem', textAlign: h.align as 'left' | 'right', fontSize: '0.75rem', fontWeight: 700, color: 'oklch(0.40 0.02 255)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => {
              const lineTotal = item.quantity * item.unitPrice
              return (
                <tr key={i} style={{ borderBottom: '1px solid oklch(0.96 0.005 255)' }}>
                  <td style={{ padding: '0.875rem 0.5rem', color: 'oklch(0.20 0.02 255)', fontWeight: 500 }}>{item.description}</td>
                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right', color: 'oklch(0.40 0.02 255)' }}>{item.quantity}</td>
                  <td style={{ padding: '0.875rem 0.5rem', color: 'oklch(0.55 0.015 255)', fontSize: '0.8rem' }}>{item.unit ?? 'stuk'}</td>
                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'oklch(0.40 0.02 255)' }}>{euro(item.unitPrice)}</td>
                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right', color: 'oklch(0.55 0.015 255)' }}>{item.vatRate}%</td>
                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'oklch(0.13 0.02 255)' }}>{euro(lineTotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totalen */}
        <div style={{ marginLeft: 'auto', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'oklch(0.50 0.015 255)' }}>
            <span>Subtotaal excl. BTW</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(factuur.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'oklch(0.50 0.015 255)' }}>
            <span>BTW</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(factuur.vatAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: 'oklch(0.13 0.02 255)', borderTop: '2px solid oklch(0.88 0.01 255)', paddingTop: '0.625rem', marginTop: '0.25rem' }}>
            <span>Totaal incl. BTW</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(factuur.total)}</span>
          </div>
        </div>

        {/* Notities */}
        {factuur.notes && (
          <div style={divider}>
            <p style={labelSmall}>Notities</p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.40 0.02 255)', margin: 0, lineHeight: 1.6 }}>{factuur.notes}</p>
          </div>
        )}

        {/* Betaalinfo */}
        {profiel?.iban && (
          <div style={{ ...divider, fontSize: '0.875rem', color: 'oklch(0.50 0.015 255)', lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>
              Gelieve te betalen voor <strong style={{ color: 'oklch(0.28 0.02 255)' }}>{verval}</strong> op rekeningnummer <strong style={{ color: 'oklch(0.28 0.02 255)' }}>{profiel.iban}</strong>
            </p>
            <p style={{ margin: '0.25rem 0 0' }}>
              o.v.v. factuurnummer <strong style={{ color: 'oklch(0.28 0.02 255)' }}>{factuur.invoiceNumber}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
