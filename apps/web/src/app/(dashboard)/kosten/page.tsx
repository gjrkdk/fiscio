import { eq, desc, sum } from 'drizzle-orm'
import { receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BonToevoegenModal } from './BonToevoegenModal'
import { BonVerwijderenKnop } from './BonVerwijderenKnop'
import { StatCard } from '@/components/ui'

const CATEGORIE_LABELS: Record<string, string> = {
  kantoor: 'Kantoor',
  reizen: 'Reizen',
  software: 'Software',
  maaltijden: 'Maaltijden',
  abonnement: 'Abonnement',
  overig: 'Overig',
}

function euro(val: string | null | undefined) {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default async function KostenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bonnen = await db
    .select()
    .from(receipts)
    .where(eq(receipts.userId, user.id))
    .orderBy(desc(receipts.receiptDate))

  const [stats] = await db
    .select({
      totaalExcl: sum(receipts.amount),
      totaalBtw: sum(receipts.vatAmount),
    })
    .from(receipts)
    .where(eq(receipts.userId, user.id))

  const totaalExcl = parseFloat(stats?.totaalExcl ?? '0') || 0
  const totaalBtw = parseFloat(stats?.totaalBtw ?? '0') || 0
  const totaalIncl = totaalExcl + totaalBtw

  const S = {
    th: { padding: '0.75rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: 'oklch(0.98 0.003 255)', textAlign: 'left' as const },
    td: { padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'oklch(0.20 0.02 255)', borderBottom: '1px solid oklch(0.96 0.005 255)' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Kosten</h1>
          <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>Bonnetjes en zakelijke uitgaven</p>
        </div>
        <BonToevoegenModal />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <StatCard label="Totaal excl. BTW" waarde={euro(totaalExcl.toString())} icon="🧾" kleur="orange" />
        <StatCard label="Voorbelasting BTW" waarde={euro(totaalBtw.toString())} icon="↩️" kleur="purple" />
        <StatCard label="Totaal incl. BTW" waarde={euro(totaalIncl.toString())} icon="💳" kleur="blue" />
      </div>

      {/* Tabel */}
      <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)', overflow: 'hidden' }}>
        {bonnen.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>🧾</p>
            <p style={{ fontWeight: 700, color: 'oklch(0.30 0.02 255)', margin: '0 0 0.375rem' }}>Nog geen bonnetjes</p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.55 0.015 255)', margin: 0 }}>Voeg je eerste uitgave toe</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {[
                  { label: 'Datum', align: 'left' }, { label: 'Leverancier', align: 'left' },
                  { label: 'Categorie', align: 'left' }, { label: 'Omschrijving', align: 'left' },
                  { label: 'Excl. BTW', align: 'right' }, { label: 'BTW', align: 'right' },
                  { label: 'Incl. BTW', align: 'right' }, { label: 'Foto', align: 'center' }, { label: '', align: 'left' },
                ].map(h => (
                  <th key={h.label} style={{ ...S.th, textAlign: h.align as 'left' | 'right' | 'center' }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bonnen.map((bon) => {
                const excl = parseFloat(bon.amount ?? '0')
                const btw = parseFloat(bon.vatAmount ?? '0')
                const incl = excl + btw
                const datum = bon.receiptDate
                  ? new Date(bon.receiptDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '-'
                return (
                  <tr key={bon.id}>
                    <td style={{ ...S.td, color: 'oklch(0.55 0.015 255)', whiteSpace: 'nowrap' }}>{datum}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{bon.vendor}</td>
                    <td style={S.td}>
                      <span style={{ display: 'inline-block', padding: '0.15rem 0.625rem', borderRadius: '2rem', fontSize: '0.75rem', background: 'oklch(0.95 0.005 255)', color: 'oklch(0.40 0.02 255)' }}>
                        {CATEGORIE_LABELS[bon.category ?? ''] ?? bon.category}
                      </span>
                    </td>
                    <td style={{ ...S.td, color: 'oklch(0.55 0.015 255)' }}>{bon.description ?? '—'}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{euro(excl.toString())}</td>
                    <td style={{ ...S.td, textAlign: 'right', color: 'oklch(0.55 0.015 255)', fontVariantNumeric: 'tabular-nums' }}>
                      {euro(btw.toString())}
                      <span style={{ fontSize: '0.72rem', color: 'oklch(0.65 0.01 255)', marginLeft: '0.25rem' }}>({bon.vatRate}%)</span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{euro(incl.toString())}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {bon.imageUrl ? (
                        <a href={`/api/kosten/foto?pad=${encodeURIComponent(bon.imageUrl)}`} target="_blank" rel="noopener noreferrer" title="Bonnetje bekijken" style={{ textDecoration: 'none', fontSize: '1rem' }}>
                          🧾
                        </a>
                      ) : (
                        <span style={{ color: 'oklch(0.80 0.01 255)' }}>—</span>
                      )}
                    </td>
                    <td style={S.td}>
                      <BonVerwijderenKnop id={bon.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
