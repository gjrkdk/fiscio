import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { invoices, receipts, trips } from '@fiscio/db'
import { eq, and, gte, lt } from 'drizzle-orm'
import { Grafieken } from './Grafieken'
import { ExportKnoppen } from './ExportKnoppen'

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const KWARTALEN = ['Q1 (jan–mrt)', 'Q2 (apr–jun)', 'Q3 (jul–sep)', 'Q4 (okt–dec)']

export default async function RapportagesPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { jaar: jaarParam } = await searchParams
  const jaar = parseInt(jaarParam ?? String(new Date().getFullYear()))
  const begin = new Date(jaar, 0, 1)
  const eind  = new Date(jaar + 1, 0, 1)

  const [factuurData, bonData, ritData] = await Promise.all([
    db.select().from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, begin), lt(invoices.createdAt, eind))),
    db.select().from(receipts)
      .where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, begin), lt(receipts.receiptDate, eind))),
    db.select().from(trips)
      .where(and(eq(trips.userId, user.id), gte(trips.startedAt, begin), lt(trips.startedAt, eind))),
  ])

  // ─── Omzet per maand ───────────────────────────────────────────────────
  const omzetPerMaand = Array.from({ length: 12 }, (_, i) => {
    const maandFacturen = factuurData.filter(f =>
      f.status !== 'draft' && new Date(f.createdAt).getMonth() === i
    )
    return {
      maand: MAANDEN[i]!,
      omzet: maandFacturen.reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0),
      btw:   maandFacturen.reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0),
    }
  })

  // ─── Kosten per categorie ──────────────────────────────────────────────
  const kostenPerCat = bonData.reduce<Record<string, number>>((acc, b) => {
    const cat = b.category ?? 'Overig'
    acc[cat] = (acc[cat] ?? 0) + parseFloat(b.amount ?? '0')
    return acc
  }, {})

  const kostenCategorieën = Object.entries(kostenPerCat)
    .map(([name, value]) => ({ name: naam(name), value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  // ─── Kosten per maand ─────────────────────────────────────────────────
  const kostenPerMaand = Array.from({ length: 12 }, (_, i) => {
    const maandBonnen = bonData.filter(b =>
      b.receiptDate && new Date(b.receiptDate).getMonth() === i
    )
    return {
      maand: MAANDEN[i]!,
      kosten: maandBonnen.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0),
    }
  })

  // ─── Gecombineerd per maand (omzet + kosten) ──────────────────────────
  const perMaand = omzetPerMaand.map((o, i) => ({
    maand: o.maand,
    omzet: Math.round(o.omzet),
    kosten: Math.round(kostenPerMaand[i]!.kosten),
    winst: Math.round(o.omzet - kostenPerMaand[i]!.kosten),
  }))

  // ─── Factuurstatus ────────────────────────────────────────────────────
  const factuurStatus = ['paid', 'sent', 'draft', 'overdue'].map(s => ({
    name: statusLabel(s),
    value: factuurData.filter(f => f.status === s).length,
    bedrag: factuurData.filter(f => f.status === s)
      .reduce((sum, f) => sum + parseFloat(f.total ?? '0'), 0),
  })).filter(s => s.value > 0)

  // ─── Kwartaaloverzicht ────────────────────────────────────────────────
  const kwartalen = [0, 1, 2, 3].map(q => {
    const startMaand = q * 3
    const qFacturen = factuurData.filter(f => {
      const m = new Date(f.createdAt).getMonth()
      return f.status !== 'draft' && m >= startMaand && m < startMaand + 3
    })
    const qBonnen = bonData.filter(b => {
      if (!b.receiptDate) return false
      const m = new Date(b.receiptDate).getMonth()
      return m >= startMaand && m < startMaand + 3
    })
    const omzet = qFacturen.reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
    const kosten = qBonnen.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
    return {
      kwartaal: KWARTALEN[q]!,
      omzet: Math.round(omzet),
      kosten: Math.round(kosten),
      winst: Math.round(omzet - kosten),
      btw: Math.round(qFacturen.reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0)),
    }
  })

  // ─── Samenvattende KPI's ──────────────────────────────────────────────
  const totaalOmzet  = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
  const totaalKosten = bonData.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
  const totaalBtw    = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0)
  const totaalKmZak  = ritData.filter(r => r.isBusinessTrip).reduce((s, r) => s + parseFloat(r.distanceKm ?? '0'), 0)
  const openstaand   = factuurData.filter(f => f.status === 'sent').reduce((s, f) => s + parseFloat(f.total ?? '0'), 0)

  const beschikbareJaren = [new Date().getFullYear(), new Date().getFullYear() - 1]

  const S = {
    card: { background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)', overflow: 'hidden' as const },
    th: { padding: '0.75rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: 'oklch(0.98 0.003 255)', textAlign: 'left' as const },
    td: { padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'oklch(0.20 0.02 255)', borderBottom: '1px solid oklch(0.96 0.005 255)' },
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header + jaar selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Rapportages</h1>
          <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>Financieel overzicht {jaar}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {beschikbareJaren.map(j => (
            <a key={j} href={`/rapportages?jaar=${j}`} style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
              background: j === jaar ? 'oklch(0.52 0.21 255)' : 'oklch(0.95 0.005 255)',
              color: j === jaar ? 'white' : 'oklch(0.45 0.015 255)',
            }}>
              {j}
            </a>
          ))}
        </div>
      </div>

      {/* KPI kaarten */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        <KpiKaart label="Omzet" waarde={totaalOmzet} bg="oklch(0.95 0.04 255)" kleur="oklch(0.40 0.22 255)" prefix="€" />
        <KpiKaart label="Kosten" waarde={totaalKosten} bg="oklch(0.94 0.05 25)" kleur="oklch(0.43 0.20 25)" prefix="€" />
        <KpiKaart label="Winst" waarde={totaalOmzet - totaalKosten} bg={totaalOmzet >= totaalKosten ? 'oklch(0.94 0.05 145)' : 'oklch(0.94 0.05 25)'} kleur={totaalOmzet >= totaalKosten ? 'oklch(0.35 0.18 145)' : 'oklch(0.43 0.20 25)'} prefix="€" />
        <KpiKaart label="BTW afdracht" waarde={totaalBtw} bg="oklch(0.95 0.04 290)" kleur="oklch(0.40 0.20 290)" prefix="€" />
        <KpiKaart label="Zakelijke km" waarde={Math.round(totaalKmZak)} bg="oklch(0.96 0.04 70)" kleur="oklch(0.45 0.18 70)" suffix=" km" />
      </div>

      {/* Openstaand alert */}
      {openstaand > 0 && (
        <div style={{ background: 'oklch(0.96 0.04 70)', border: '1px solid oklch(0.88 0.07 70)', borderRadius: '0.875rem', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>⚠️</span>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'oklch(0.42 0.18 70)' }}>
            <strong>€{Math.round(openstaand).toLocaleString('nl-NL')}</strong> aan openstaande facturen
          </p>
        </div>
      )}

      {/* Export */}
      <ExportKnoppen jaar={jaar} />

      {/* Grafieken */}
      <Grafieken perMaand={perMaand} kostenCategorieën={kostenCategorieën} factuurStatus={factuurStatus} />

      {/* Kwartaaloverzicht tabel */}
      <div style={S.card}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)' }}>Kwartaaloverzicht {jaar}</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              {['Kwartaal', 'Omzet', 'Kosten', 'Winst', 'BTW'].map((h, i) => (
                <th key={h} style={{ ...S.th, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kwartalen.map(kw => (
              <tr key={kw.kwartaal}>
                <td style={{ ...S.td, fontWeight: 600 }}>{kw.kwartaal}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>€{kw.omzet.toLocaleString('nl-NL')}</td>
                <td style={{ ...S.td, textAlign: 'right', color: 'oklch(0.43 0.20 25)' }}>€{kw.kosten.toLocaleString('nl-NL')}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: kw.winst >= 0 ? 'oklch(0.35 0.18 145)' : 'oklch(0.43 0.20 25)' }}>€{kw.winst.toLocaleString('nl-NL')}</td>
                <td style={{ ...S.td, textAlign: 'right', color: 'oklch(0.40 0.20 290)' }}>€{kw.btw.toLocaleString('nl-NL')}</td>
              </tr>
            ))}
            <tr style={{ background: 'oklch(0.97 0.007 255)' }}>
              <td style={{ ...S.td, fontWeight: 700, color: 'oklch(0.13 0.02 255)' }}>Totaal {jaar}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>€{Math.round(totaalOmzet).toLocaleString('nl-NL')}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: 'oklch(0.43 0.20 25)' }}>€{Math.round(totaalKosten).toLocaleString('nl-NL')}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: (totaalOmzet - totaalKosten) >= 0 ? 'oklch(0.35 0.18 145)' : 'oklch(0.43 0.20 25)' }}>€{Math.round(totaalOmzet - totaalKosten).toLocaleString('nl-NL')}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: 'oklch(0.40 0.20 290)' }}>€{Math.round(totaalBtw).toLocaleString('nl-NL')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiKaart({ label, waarde, bg, kleur, prefix = '', suffix = '' }: {
  label: string; waarde: number; bg: string; kleur: string; prefix?: string; suffix?: string
}) {
  return (
    <div style={{ background: bg, borderRadius: '0.875rem', padding: '1rem 1.25rem', border: '1px solid oklch(0 0 0 / 0.06)' }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: kleur, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.5rem', opacity: 0.8 }}>{label}</p>
      <p style={{ fontSize: '1.375rem', fontWeight: 800, color: kleur, margin: 0 }}>
        {prefix}{Math.abs(Math.round(waarde)).toLocaleString('nl-NL')}{suffix}
      </p>
    </div>
  )
}

function statusLabel(s: string) {
  return { paid: 'Betaald', sent: 'Openstaand', draft: 'Concept', overdue: 'Verlopen' }[s] ?? s
}

function naam(cat: string) {
  const map: Record<string, string> = {
    kantoor: 'Kantoor', software: 'Software', reizen: 'Reizen',
    marketing: 'Marketing', hardware: 'Hardware', overig: 'Overig',
  }
  return map[cat.toLowerCase()] ?? cat
}
