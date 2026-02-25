import { eq, sum, and, gte, count, desc } from 'drizzle-orm'
import { trips, invoices, receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/ui'
import Link from 'next/link'

function euro(val: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(val)
}

function groet() {
  const uur = new Date().getHours()
  if (uur < 12) return 'Goedemorgen'
  if (uur < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const startOfYear  = new Date(now.getFullYear(), 0, 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [kmJaar, omzetJaar, omzetMaand, openstaandRes, onkostenJaar, recenteRitten, recenteFacturen] = await Promise.all([
    db.select({ totaal: sum(trips.distanceKm) }).from(trips)
      .where(and(eq(trips.userId, user.id), eq(trips.isBusinessTrip, true), gte(trips.startedAt, startOfYear))),
    db.select({ totaal: sum(invoices.subtotal) }).from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, startOfYear))),
    db.select({ totaal: sum(invoices.subtotal) }).from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, startOfMonth))),
    db.select({ aantal: count(), totaal: sum(invoices.total) }).from(invoices)
      .where(and(eq(invoices.userId, user.id), eq(invoices.status, 'sent'))),
    db.select({ totaal: sum(receipts.amount) }).from(receipts)
      .where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, startOfYear))),
    db.select().from(trips).where(eq(trips.userId, user.id)).orderBy(desc(trips.startedAt)).limit(4),
    db.select().from(invoices).where(eq(invoices.userId, user.id)).orderBy(desc(invoices.createdAt)).limit(4),
  ])

  const kmTotaal       = parseFloat(kmJaar[0]?.totaal ?? '0') || 0
  const omzetJaarVal   = parseFloat(omzetJaar[0]?.totaal ?? '0') || 0
  const omzetMaandVal  = parseFloat(omzetMaand[0]?.totaal ?? '0') || 0
  const aantalOpen     = openstaandRes[0]?.aantal ?? 0
  const totaalOpen     = parseFloat(openstaandRes[0]?.totaal ?? '0') || 0
  const kostenJaar     = parseFloat(onkostenJaar[0]?.totaal ?? '0') || 0
  const winst          = omzetJaarVal - kostenJaar
  const maandNaam      = now.toLocaleDateString('nl-NL', { month: 'long' })

  const STATUS_LABEL: Record<string, string> = { paid: 'Betaald', sent: 'Openstaand', draft: 'Concept', overdue: 'Verlopen' }
  const STATUS_KLEUR: Record<string, string> = {
    paid: 'oklch(0.38 0.18 145)', sent: 'oklch(0.50 0.18 70)',
    draft: 'oklch(0.55 0.01 255)', overdue: 'oklch(0.43 0.20 25)',
  }
  const STATUS_BG: Record<string, string> = {
    paid: 'oklch(0.94 0.05 145)', sent: 'oklch(0.95 0.04 70)',
    draft: 'oklch(0.95 0.01 255)', overdue: 'oklch(0.94 0.05 25)',
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Groet */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginBottom: '0.25rem' }}>
          {groet()} · {now.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>
          Dashboard
        </h1>
      </div>

      {/* Openstaand alert */}
      {aantalOpen > 0 && (
        <Link href="/facturen" style={{ textDecoration: 'none' }}>
          <div style={{
            marginBottom: '1.5rem', padding: '0.875rem 1.25rem',
            background: 'oklch(0.96 0.04 70)', border: '1px solid oklch(0.88 0.07 70)',
            borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.42 0.18 70)' }}>
                  {aantalOpen} openstaande factuur{aantalOpen > 1 ? 'en'  : ''}
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'oklch(0.55 0.15 70)' }}>
                  Totaal: {euro(totaalOpen)} nog te ontvangen
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'oklch(0.48 0.18 70)', fontWeight: 600 }}>Bekijk →</span>
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Omzet dit jaar" waarde={euro(omzetJaarVal)} sub="excl. BTW" icon="💰" kleur="blue" />
        <StatCard label={`Omzet ${maandNaam}`} waarde={euro(omzetMaandVal)} sub="deze maand" icon="📈" kleur="green" />
        <StatCard label="Nettowinst" waarde={euro(winst)} sub="omzet minus kosten" icon="✨" kleur={winst >= 0 ? 'green' : 'red'} />
        <StatCard label="Zakelijke km" waarde={`${Math.round(kmTotaal).toLocaleString('nl-NL')} km`} sub={`≈ ${euro(kmTotaal * 0.23)} vergoeding`} icon="🚗" kleur="purple" />
      </div>

      {/* Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Recente ritten */}
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', overflow: 'hidden', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid oklch(0.95 0.005 255)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)' }}>Recente ritten</h2>
            <Link href="/ritten" style={{ fontSize: '0.775rem', color: 'oklch(0.52 0.21 255)', textDecoration: 'none', fontWeight: 600 }}>Alle ritten →</Link>
          </div>
          {recenteRitten.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'oklch(0.60 0.01 255)', fontSize: '0.85rem' }}>
              Nog geen ritten geregistreerd
            </div>
          ) : recenteRitten.map(rit => (
            <div key={rit.id} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid oklch(0.97 0.003 255)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'oklch(0.20 0.02 255)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rit.description}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'oklch(0.55 0.015 255)' }}>
                  {new Date(rit.startedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'oklch(0.20 0.02 255)' }}>{parseFloat(rit.distanceKm).toFixed(1)} km</p>
                <span style={{
                  fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '2rem', fontWeight: 600,
                  background: rit.isBusinessTrip ? 'oklch(0.95 0.04 255)' : 'oklch(0.95 0.01 255)',
                  color: rit.isBusinessTrip ? 'oklch(0.40 0.22 255)' : 'oklch(0.50 0.01 255)',
                }}>
                  {rit.isBusinessTrip ? 'Zakelijk' : 'Privé'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Recente facturen */}
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', overflow: 'hidden', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid oklch(0.95 0.005 255)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)' }}>Recente facturen</h2>
            <Link href="/facturen" style={{ fontSize: '0.775rem', color: 'oklch(0.52 0.21 255)', textDecoration: 'none', fontWeight: 600 }}>Alle facturen →</Link>
          </div>
          {recenteFacturen.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'oklch(0.60 0.01 255)', fontSize: '0.85rem' }}>
              Nog geen facturen aangemaakt
            </div>
          ) : recenteFacturen.map(f => (
            <Link key={f.id} href={`/facturen/${f.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid oklch(0.97 0.003 255)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'oklch(0.20 0.02 255)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.clientName}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'oklch(0.55 0.015 255)' }}>{f.invoiceNumber}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'oklch(0.20 0.02 255)' }}>{euro(parseFloat(f.total ?? '0'))}</p>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '2rem', fontWeight: 600,
                    background: STATUS_BG[f.status] ?? STATUS_BG.draft,
                    color: STATUS_KLEUR[f.status] ?? STATUS_KLEUR.draft,
                  }}>
                    {STATUS_LABEL[f.status] ?? f.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
