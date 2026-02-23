import { desc, eq, sum } from 'drizzle-orm'
import { trips } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RitToevoegenForm } from '@/components/ritten/RitToevoegenForm'
import { RitVerwijderenButton } from '@/components/ritten/RitVerwijderenButton'

function formatDatum(date: Date) {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatKm(km: string) {
  return `${parseFloat(km).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km`
}

export default async function RittenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [rittenLijst, totaalResult] = await Promise.all([
    db
      .select()
      .from(trips)
      .where(eq(trips.userId, user.id))
      .orderBy(desc(trips.startedAt)),
    db
      .select({ totaal: sum(trips.distanceKm) })
      .from(trips)
      .where(eq(trips.userId, user.id)),
  ])

  const totaalKm = parseFloat(totaalResult[0]?.totaal ?? '0')
  const zakelijkeKm = rittenLijst
    .filter((r) => r.isBusinessTrip)
    .reduce((sum, r) => sum + parseFloat(r.distanceKm), 0)

  // Belastingdienst vergoeding: €0,23/km (2025)
  const vergoeding = zakelijkeKm * 0.23

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ritregistratie</h2>
        <RitToevoegenForm />
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Totaal km (jaar)</p>
          <p className="text-xl font-bold text-gray-900">
            {totaalKm.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} km
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Zakelijke km</p>
          <p className="text-xl font-bold text-gray-900">
            {zakelijkeKm.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} km
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Vergoeding (€0,23/km)</p>
          <p className="text-xl font-bold text-green-700">
            € {vergoeding.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-[120px_1fr_1fr_80px_70px_80px] gap-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <span>Datum</span>
            <span>Omschrijving</span>
            <span>Route</span>
            <span>Km</span>
            <span>Type</span>
            <span></span>
          </div>
        </div>

        {rittenLijst.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Nog geen ritten. Klik op &ldquo;+ Rit toevoegen&rdquo; om te beginnen.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rittenLijst.map((rit) => (
              <div
                key={rit.id}
                className="grid grid-cols-[120px_1fr_1fr_80px_70px_80px] gap-3 p-4 items-center hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-600">{formatDatum(rit.startedAt)}</span>
                <span className="text-sm font-medium text-gray-900 truncate">{rit.description}</span>
                <span className="text-xs text-gray-500 truncate">
                  {rit.startAddress} → {rit.endAddress}
                </span>
                <span className="text-sm font-medium text-gray-900">{formatKm(rit.distanceKm)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                  rit.isBusinessTrip
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {rit.isBusinessTrip ? 'Zakelijk' : 'Privé'}
                </span>
                <div className="flex justify-end">
                  <RitVerwijderenButton id={rit.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
