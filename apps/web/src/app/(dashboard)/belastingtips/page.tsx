import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { invoices, receipts, users } from '@fiscio/db'
import { eq, and, gte } from 'drizzle-orm'
import { berekenTips, type BelastingTip, type TipStatus, BELASTING_PARAMS } from '@/lib/belastingtips'
import { UrenTracker } from './UrenTracker'

// ─── Status stijlen (inline — geen dynamische Tailwind) ────────────────────
const STATUS_STYLES: Record<TipStatus, {
  label: string
  cardBg: string; cardBorder: string
  badgeBg: string; badgeColor: string; badgeBorder: string
}> = {
  kans:     { label: '💡 Kans',       cardBg: 'oklch(0.96 0.03 255)', cardBorder: 'oklch(0.85 0.06 255)', badgeBg: 'oklch(0.93 0.06 255)', badgeColor: 'oklch(0.38 0.20 255)', badgeBorder: 'oklch(0.85 0.08 255)' },
  aandacht: { label: '⚠️ Aandacht',   cardBg: 'oklch(0.97 0.03 70)',  cardBorder: 'oklch(0.88 0.07 70)',  badgeBg: 'oklch(0.93 0.06 70)',  badgeColor: 'oklch(0.42 0.18 70)',  badgeBorder: 'oklch(0.85 0.09 70)' },
  op_koers: { label: '✅ Op koers',   cardBg: 'oklch(0.96 0.03 145)', cardBorder: 'oklch(0.85 0.07 145)', badgeBg: 'oklch(0.93 0.06 145)', badgeColor: 'oklch(0.35 0.18 145)', badgeBorder: 'oklch(0.82 0.09 145)' },
  nvt:      { label: 'N.v.t.',        cardBg: 'oklch(0.97 0.003 255)', cardBorder: 'oklch(0.91 0.01 255)', badgeBg: 'oklch(0.96 0.005 255)', badgeColor: 'oklch(0.55 0.01 255)', badgeBorder: 'oklch(0.91 0.01 255)' },
}

// ─── Tip-kaart ──────────────────────────────────────────────────────────────
function TipKaart({ tip, urenHuidigJaar }: { tip: BelastingTip; urenHuidigJaar: number }) {
  const s = STATUS_STYLES[tip.status]!
  return (
    <div style={{ borderRadius: '1rem', border: `1.5px solid ${s.cardBorder}`, background: s.cardBg, padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.875rem' }}>
        <div>
          <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: '2rem', marginBottom: '0.5rem', background: s.badgeBg, color: s.badgeColor, border: `1px solid ${s.badgeBorder}` }}>
            {s.label}
          </span>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'oklch(0.13 0.02 255)', margin: 0 }}>{tip.titel}</h3>
        </div>
        {tip.impact !== null && tip.impact > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'oklch(0.55 0.015 255)', marginBottom: '0.125rem' }}>Besparing</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'oklch(0.35 0.18 145)' }}>
              €{tip.impact.toLocaleString('nl-NL')}
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.875rem', color: 'oklch(0.35 0.02 255)', lineHeight: 1.6, margin: '0 0 1rem' }}>{tip.uitleg}</p>

      {tip.id === 'urencriterium' && (
        <UrenTracker huidigUren={urenHuidigJaar} />
      )}

      {tip.actie && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${s.cardBorder}` }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actie:</span>
          <span style={{ fontSize: '0.875rem', color: 'oklch(0.28 0.02 255)' }}>{tip.actie}</span>
        </div>
      )}
    </div>
  )
}

// ─── Pagina ────────────────────────────────────────────────────────────────
export default async function BelastingtipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nu = new Date()
  const beginJaar = new Date(nu.getFullYear(), 0, 1)

  const [factuurData, kostenData, gebruikerData] = await Promise.all([
    db.select({ total: invoices.total, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, beginJaar))),
    db.select({ amount: receipts.amount, category: receipts.category })
      .from(receipts)
      .where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, beginJaar))),
    db.select().from(users).where(eq(users.id, user.id)).limit(1),
  ])

  const omzetJaar = factuurData
    .filter(f => f.status !== 'draft')
    .reduce((s, f) => s + parseFloat(f.total ?? '0'), 0)

  const kostenJaar = kostenData.reduce((s, r) => s + parseFloat(r.amount ?? '0'), 0)

  const investeerdbedragJaar = kostenData
    .filter(r => ['kantoor', 'software'].includes(r.category ?? ''))
    .reduce((s, r) => s + parseFloat(r.amount ?? '0'), 0)

  const gebruiker = gebruikerData[0]
  const urenGeregistreerd = gebruiker?.urenHuidigJaar ?? 0

  const data = berekenTips({ omzetJaar, kostenJaar, investeerdbedragJaar, urenGeregistreerd })
  const aantalKansen = data.tips.filter(t => t.status === 'kans' || t.status === 'aandacht').length

  const volgorde: TipStatus[] = ['aandacht', 'kans', 'op_koers', 'nvt']
  const gesorteerd = [...data.tips].sort((a, b) => volgorde.indexOf(a.status) - volgorde.indexOf(b.status))

  const urenPct = Math.min(100, (urenGeregistreerd / BELASTING_PARAMS.uren_drempel) * 100)
  const urenBarKleur = urenGeregistreerd >= BELASTING_PARAMS.uren_drempel
    ? 'oklch(0.50 0.18 145)'
    : urenGeregistreerd > BELASTING_PARAMS.uren_drempel * 0.7
    ? 'oklch(0.52 0.21 255)'
    : 'oklch(0.60 0.18 70)'

  const kaartStyle = { background: 'white', borderRadius: '0.875rem', border: '1px solid oklch(0.91 0.01 255)', padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px oklch(0 0 0 / 0.03)' }

  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Belastingtips</h1>
        <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>
          Gebaseerd op jouw data van {nu.getFullYear()} — automatisch bijgewerkt.
        </p>
      </div>

      {/* KPI samenvatting */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        <div style={kaartStyle}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>Omzet {nu.getFullYear()}</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)' }}>€{Math.round(data.omzetJaar).toLocaleString('nl-NL')}</div>
        </div>
        <div style={kaartStyle}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>Geschatte winst</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)' }}>€{Math.round(data.winstJaar).toLocaleString('nl-NL')}</div>
        </div>
        <div style={{ ...kaartStyle, background: 'oklch(0.95 0.04 145)', border: '1px solid oklch(0.85 0.07 145)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.35 0.18 145)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>Potentiële besparing</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'oklch(0.35 0.18 145)' }}>€{data.totaalPotentieel.toLocaleString('nl-NL')}</div>
        </div>
      </div>

      {/* Uren voortgang */}
      <div style={kaartStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.28 0.02 255)' }}>
            Urencriterium — {urenGeregistreerd} / {BELASTING_PARAMS.uren_drempel} uur
          </span>
          <span style={{ fontSize: '0.75rem', color: 'oklch(0.60 0.01 255)' }}>
            Dag {data.dagenVerstreken} / {data.dagenInJaar} van {nu.getFullYear()}
          </span>
        </div>
        <div style={{ height: 8, background: 'oklch(0.94 0.005 255)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${urenPct}%`, background: urenBarKleur, borderRadius: 999, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'oklch(0.60 0.01 255)', marginTop: '0.375rem' }}>
          Dagpace nodig: {data.dagenInJaar - data.dagenVerstreken > 0
            ? ((BELASTING_PARAMS.uren_drempel - urenGeregistreerd) / (data.dagenInJaar - data.dagenVerstreken)).toFixed(1)
            : '0'} uur/dag
        </div>
      </div>

      {/* Tips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {aantalKansen === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'oklch(0.55 0.015 255)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <div style={{ fontWeight: 700, color: 'oklch(0.28 0.02 255)', marginBottom: '0.25rem' }}>Alles op orde!</div>
            <div style={{ fontSize: '0.875rem' }}>Geen directe aandachtspunten gevonden.</div>
          </div>
        )}
        {gesorteerd.map(tip => (
          <TipKaart key={tip.id} tip={tip} urenHuidigJaar={urenGeregistreerd} />
        ))}
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: '0.75rem', color: 'oklch(0.65 0.01 255)', textAlign: 'center', marginTop: '0.5rem' }}>
        Deze tips zijn indicatief op basis van jouw geregistreerde data. Raadpleeg een belastingadviseur voor persoonlijk advies.
        Bedragen gebaseerd op belastingregels {nu.getFullYear()}.
      </p>
    </div>
  )
}
