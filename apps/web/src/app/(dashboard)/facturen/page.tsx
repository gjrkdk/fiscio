import { eq, desc } from 'drizzle-orm'
import { invoices } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from './StatusBadge'

function euro(val: string | null | undefined) {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default async function FacturenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const facturen = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, user.id))
    .orderBy(desc(invoices.createdAt))

  const openstaand = facturen.filter(f => f.status === 'sent')
  const totaalOpenstaand = openstaand.reduce((sum, f) => sum + parseFloat(f.total ?? '0'), 0)

  const S = {
    th: { padding: '0.75rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: 'oklch(0.98 0.003 255)', textAlign: 'left' as const },
    td: { padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'oklch(0.20 0.02 255)', borderBottom: '1px solid oklch(0.96 0.005 255)' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Facturen</h1>
          {openstaand.length > 0 && (
            <p style={{ fontSize: '0.85rem', color: 'oklch(0.45 0.18 70)', marginTop: '0.25rem' }}>
              {openstaand.length} openstaande factuur{openstaand.length !== 1 ? 'en' : ''} · {euro(totaalOpenstaand.toString())}
            </p>
          )}
        </div>
        <Link href="/facturen/nieuw" style={{
          padding: '0.625rem 1.25rem', background: 'oklch(0.52 0.21 255)', color: 'white',
          borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 2px 8px oklch(0.52 0.21 255 / 0.25)',
        }}>
          + Nieuwe factuur
        </Link>
      </div>

      <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)', overflow: 'hidden' }}>
        {facturen.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>📄</p>
            <p style={{ fontWeight: 700, color: 'oklch(0.30 0.02 255)', margin: '0 0 0.375rem' }}>Nog geen facturen</p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.55 0.015 255)', margin: 0 }}>Maak je eerste factuur aan</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {['Nummer', 'Klant', 'Datum', 'Vervaldatum', 'Bedrag', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ ...S.th, textAlign: h === 'Bedrag' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturen.map(f => {
                const datum = f.createdAt ? new Date(f.createdAt).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
                const verval = f.dueDate ? new Date(f.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
                const isVervallen = f.status === 'sent' && f.dueDate && new Date(f.dueDate) < new Date()
                return (
                  <tr key={f.id}>
                    <td style={{ ...S.td, fontFamily: 'monospace', color: 'oklch(0.40 0.02 255)' }}>{f.invoiceNumber}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{f.clientName}</td>
                    <td style={{ ...S.td, color: 'oklch(0.55 0.015 255)' }}>{datum}</td>
                    <td style={{ ...S.td, color: isVervallen ? 'oklch(0.43 0.20 25)' : 'oklch(0.55 0.015 255)', fontWeight: isVervallen ? 600 : 400 }}>{verval}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{euro(f.total)}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <StatusBadge status={f.status} />
                        {f.reminderSentAt && (
                          <span style={{ fontSize: '0.7rem', color: 'oklch(0.45 0.18 70)', background: 'oklch(0.95 0.04 70)', padding: '0.15rem 0.5rem', borderRadius: '2rem', whiteSpace: 'nowrap' }}>
                            🔔 herinnering
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={S.td}>
                      <Link href={`/facturen/${f.id}`} style={{ fontSize: '0.8rem', color: 'oklch(0.52 0.21 255)', textDecoration: 'none', fontWeight: 600 }}>
                        Bekijk →
                      </Link>
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
