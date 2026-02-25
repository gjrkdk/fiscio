import { eq, and, gte, lte, sum } from 'drizzle-orm'
import { invoices, receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BtwKwartaalSelector } from './BtwKwartaalSelector'

function euro(val: string | number | null | undefined) {
  const n = typeof val === 'number' ? val : parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function kwartaalDatums(jaar: number, kwartaal: number) {
  const startMaand = (kwartaal - 1) * 3
  const start = new Date(jaar, startMaand, 1)
  const eind = new Date(jaar, startMaand + 3, 0, 23, 59, 59)
  return { start, eind }
}

type Props = {
  searchParams: Promise<{ jaar?: string; kwartaal?: string }>
}

export default async function BtwPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const jaar = parseInt(params.jaar ?? String(now.getFullYear()))
  const kwartaal = parseInt(params.kwartaal ?? String(Math.ceil((now.getMonth() + 1) / 3)))
  const { start, eind } = kwartaalDatums(jaar, kwartaal)

  // Omzet + BTW ontvangen (gefactureerd — sent of paid)
  const [factuurStats] = await db
    .select({
      omzet: sum(invoices.subtotal),
      btwOntvangen: sum(invoices.vatAmount),
      totaal: sum(invoices.total),
    })
    .from(invoices)
    .where(and(
      eq(invoices.userId, user.id),
      gte(invoices.createdAt, start),
      lte(invoices.createdAt, eind),
    ))

  // BTW betaald (op kosten/bonnetjes)
  const [kostenStats] = await db
    .select({
      kostenExcl: sum(receipts.amount),
      btwBetaald: sum(receipts.vatAmount),
    })
    .from(receipts)
    .where(and(
      eq(receipts.userId, user.id),
      gte(receipts.receiptDate, start),
      lte(receipts.receiptDate, eind),
    ))

  const omzet = parseFloat(factuurStats?.omzet ?? '0') || 0
  const btwOntvangen = parseFloat(factuurStats?.btwOntvangen ?? '0') || 0
  const kostenExcl = parseFloat(kostenStats?.kostenExcl ?? '0') || 0
  const btwBetaald = parseFloat(kostenStats?.btwBetaald ?? '0') || 0
  const saldo = btwOntvangen - btwBetaald // positief = te betalen, negatief = te ontvangen

  const kwartaalNaam = `Q${kwartaal} ${jaar}`
  const aangifteDeadline = [
    '', 'vóór 30 april', 'vóór 31 juli', 'vóór 31 oktober', 'vóór 31 januari',
  ][kwartaal] ?? ''

  const card = { background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)', overflow: 'hidden' as const }
  const saldoPositief = saldo > 0

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>BTW-aangifte</h1>
          <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>Kwartaaloverzicht voor de Belastingdienst</p>
        </div>
        <BtwKwartaalSelector jaar={jaar} kwartaal={kwartaal} />
      </div>

      {/* Deadline banner */}
      <div style={{ background: 'oklch(0.96 0.04 70)', border: '1px solid oklch(0.88 0.07 70)', borderRadius: '0.875rem', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>📅</span>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.42 0.18 70)' }}>{kwartaalNaam} — aangifte {aangifteDeadline}</p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'oklch(0.55 0.15 70)', marginTop: '0.125rem' }}>Dien je aangifte in via Mijn Belastingdienst Zakelijk</p>
        </div>
      </div>

      {/* Omzetoverzicht */}
      <div style={card}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)' }}>Omzetoverzicht {kwartaalNaam}</h3>
        </div>
        {[
          { label: 'Omzet excl. BTW (1a)', value: omzet, desc: 'Totaal gefactureerd bedrag' },
          { label: 'Verschuldigde BTW (1b)', value: btwOntvangen, desc: 'BTW op uitgaande facturen' },
        ].map((row, i) => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: i === 0 ? '1px solid oklch(0.96 0.005 255)' : 'none' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.20 0.02 255)' }}>{row.label}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'oklch(0.60 0.01 255)', marginTop: '0.125rem' }}>{row.desc}</p>
            </div>
            <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', fontVariantNumeric: 'tabular-nums' }}>{euro(row.value)}</p>
          </div>
        ))}
      </div>

      {/* Voorbelasting */}
      <div style={card}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)' }}>Voorbelasting (aftrekbare BTW)</h3>
        </div>
        {[
          { label: 'Kosten excl. BTW', value: kostenExcl, desc: 'Totaal zakelijke uitgaven' },
          { label: 'Betaalde BTW (5b)', value: btwBetaald, desc: 'BTW op inkopen en kosten' },
        ].map((row, i) => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: i === 0 ? '1px solid oklch(0.96 0.005 255)' : 'none' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.20 0.02 255)' }}>{row.label}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'oklch(0.60 0.01 255)', marginTop: '0.125rem' }}>{row.desc}</p>
            </div>
            <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', fontVariantNumeric: 'tabular-nums' }}>{euro(row.value)}</p>
          </div>
        ))}
      </div>

      {/* Saldo */}
      <div style={{
        borderRadius: '1rem', padding: '1.5rem',
        border: `2px solid ${saldoPositief ? 'oklch(0.80 0.10 25)' : 'oklch(0.80 0.10 145)'}`,
        background: saldoPositief ? 'oklch(0.96 0.03 25)' : 'oklch(0.96 0.03 145)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: saldoPositief ? 'oklch(0.40 0.20 25)' : 'oklch(0.35 0.18 145)' }}>
              {saldoPositief ? '🔴 Te betalen BTW (rubriek 5c)' : '🟢 Te ontvangen BTW (teruggaaf)'}
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem', marginTop: '0.25rem', color: saldoPositief ? 'oklch(0.55 0.15 25)' : 'oklch(0.50 0.15 145)' }}>
              {saldoPositief ? 'Verschuldigde BTW minus voorbelasting' : 'Meer voorbelasting dan verschuldigde BTW'}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: saldoPositief ? 'oklch(0.40 0.20 25)' : 'oklch(0.35 0.18 145)', fontVariantNumeric: 'tabular-nums' }}>
            {euro(Math.abs(saldo))}
          </p>
        </div>
      </div>

      {/* Export */}
      <a href={`/api/btw/export?jaar=${jaar}&kwartaal=${kwartaal}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content',
        padding: '0.625rem 1.25rem', border: '1.5px solid oklch(0.88 0.01 255)',
        borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600,
        color: 'oklch(0.40 0.02 255)', textDecoration: 'none', background: 'white',
      }}>
        ↓ Exporteren als CSV
      </a>
    </div>
  )
}
