import { eq, desc, sum, count, and, gte } from 'drizzle-orm'
import { trips, receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function euro(val: string | number | null | undefined) {
  const n = typeof val === 'number' ? val : parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
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

  // Kilometers dit jaar (zakelijk)
  const [kmJaar] = await db
    .select({ totaal: sum(trips.distanceKm) })
    .from(trips)
    .where(and(
      eq(trips.userId, user.id),
      eq(trips.isBusinessTrip, true),
      gte(trips.startedAt, startOfYear),
    ))

  // Kilometers deze maand
  const [kmMaand] = await db
    .select({ totaal: sum(trips.distanceKm) })
    .from(trips)
    .where(and(
      eq(trips.userId, user.id),
      eq(trips.isBusinessTrip, true),
      gte(trips.startedAt, startOfMonth),
    ))

  // Kosten deze maand
  const [kostenMaand] = await db
    .select({ totaal: sum(receipts.amount) })
    .from(receipts)
    .where(and(
      eq(receipts.userId, user.id),
      gte(receipts.receiptDate, startOfMonth),
    ))

  // Totaal ritten dit jaar
  const [aantalRitten] = await db
    .select({ totaal: count() })
    .from(trips)
    .where(and(
      eq(trips.userId, user.id),
      gte(trips.startedAt, startOfYear),
    ))

  // Kilometervergoeding (€0,23/km)
  const kmTotaal = parseFloat(kmJaar?.totaal ?? '0') || 0
  const vergoeding = kmTotaal * 0.23

  // Recente ritten (laatste 5)
  const recenteRitten = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, user.id))
    .orderBy(desc(trips.startedAt))
    .limit(5)

  // Recente kosten (laatste 3)
  const recenteKosten = await db
    .select()
    .from(receipts)
    .where(eq(receipts.userId, user.id))
    .orderBy(desc(receipts.receiptDate))
    .limit(3)

  const maandNaam = now.toLocaleDateString('nl-NL', { month: 'long' })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-0.5">Overzicht van jouw administratie</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Km dit jaar</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{km(kmJaar?.totaal)} km</p>
          <p className="text-xs text-gray-400 mt-1">{aantalRitten?.totaal ?? 0} ritten</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Km {maandNaam}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{km(kmMaand?.totaal)} km</p>
          <p className="text-xs text-gray-400 mt-1">zakelijk</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Km-vergoeding</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{euro(vergoeding)}</p>
          <p className="text-xs text-gray-400 mt-1">€ 0,23/km · dit jaar</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Kosten {maandNaam}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{euro(kostenMaand?.totaal)}</p>
          <p className="text-xs text-gray-400 mt-1">excl. BTW</p>
        </div>
      </div>

      {/* Recente ritten */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recente ritten</h3>
          <Link href="/ritten" className="text-xs text-blue-600 hover:underline">Alle ritten →</Link>
        </div>
        {recenteRitten.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-6">Nog geen ritten geregistreerd.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recenteRitten.map(rit => {
              const datum = rit.startedAt
                ? new Date(rit.startedAt).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
                : '-'
              return (
                <div key={rit.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-12 shrink-0">{datum}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rit.description}</p>
                      {rit.startAddress && rit.endAddress && (
                        <p className="text-xs text-gray-400">{rit.startAddress} → {rit.endAddress}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-medium text-gray-900">{km(rit.distanceKm)} km</p>
                    {rit.isBusinessTrip && (
                      <p className="text-xs text-green-600">{euro(parseFloat(rit.distanceKm ?? '0') * 0.23)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recente kosten */}
      {recenteKosten.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recente kosten</h3>
            <Link href="/kosten" className="text-xs text-blue-600 hover:underline">Alle kosten →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recenteKosten.map(bon => {
              const datum = bon.receiptDate
                ? new Date(bon.receiptDate).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
                : '-'
              const incl = parseFloat(bon.amount ?? '0') + parseFloat(bon.vatAmount ?? '0')
              return (
                <div key={bon.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-12 shrink-0">{datum}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bon.vendor}</p>
                      <p className="text-xs text-gray-400">{bon.category}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 shrink-0 ml-4">{euro(incl)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
