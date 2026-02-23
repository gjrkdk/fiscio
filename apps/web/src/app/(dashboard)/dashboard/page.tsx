import { eq, sum, and, gte, count } from 'drizzle-orm'
import { trips, invoices } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function euro(val: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(val)
}

function km(val: string | null | undefined) {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? '0' : new Intl.NumberFormat('nl-NL').format(Math.round(n))
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [kmJaar] = await db
    .select({ totaal: sum(trips.distanceKm) })
    .from(trips)
    .where(and(
      eq(trips.userId, user.id),
      eq(trips.isBusinessTrip, true),
      gte(trips.startedAt, startOfYear),
    ))

  const kmTotaal = parseFloat(kmJaar?.totaal ?? '0') || 0

  // Omzet dit jaar (betaald + verzonden)
  const [omzetJaar] = await db
    .select({ totaal: sum(invoices.total) })
    .from(invoices)
    .where(and(
      eq(invoices.userId, user.id),
      gte(invoices.createdAt, startOfYear),
    ))

  // Omzet deze maand
  const [omzetMaand] = await db
    .select({ totaal: sum(invoices.total) })
    .from(invoices)
    .where(and(
      eq(invoices.userId, user.id),
      gte(invoices.createdAt, startOfMonth),
    ))

  // Openstaande facturen
  const [openstaand] = await db
    .select({ aantal: count() })
    .from(invoices)
    .where(and(
      eq(invoices.userId, user.id),
      eq(invoices.status, 'sent'),
    ))

  const maandNaam = now.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
  const omzetJaarVal = parseFloat(omzetJaar?.totaal ?? '0') || 0
  const omzetMaandVal = parseFloat(omzetMaand?.totaal ?? '0') || 0
  const aantalOpenstaand = openstaand?.aantal ?? 0

  const stats = [
    {
      label: 'Kilometers dit jaar',
      value: `${km(kmTotaal.toString())} km`,
      sub: 'zakelijk',
    },
    {
      label: 'Omzet dit jaar',
      value: omzetJaarVal > 0 ? euro(omzetJaarVal) : '€ —',
      sub: 'gefactureerd',
    },
    {
      label: `Omzet ${maandNaam}`,
      value: omzetMaandVal > 0 ? euro(omzetMaandVal) : '€ —',
      sub: 'gefactureerd',
    },
    {
      label: 'Openstaande facturen',
      value: aantalOpenstaand > 0 ? String(aantalOpenstaand) : '—',
      sub: aantalOpenstaand > 0 ? 'nog te ontvangen' : 'geen openstaand',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-0.5">{now.getFullYear()} · overzicht</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="bg-white p-6 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
