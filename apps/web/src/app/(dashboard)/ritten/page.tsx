import { desc, eq, sum, or, isNull } from 'drizzle-orm'
import { trips } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RitToevoegenForm } from '@/components/ritten/RitToevoegenForm'
import { RitVerwijderenButton } from '@/components/ritten/RitVerwijderenButton'
import { RitClassificatieBadge, RitOverrideKnoppen, ClassificeerAllesKnop } from './RitClassificatie'
import { StatCard } from '@/components/ui'

function formatDatum(date: Date) {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function formatKm(km: string) {
  return `${parseFloat(km).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km`
}

export default async function RittenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [rittenLijst, totaalResult] = await Promise.all([
    db.select().from(trips).where(eq(trips.userId, user.id)).orderBy(desc(trips.startedAt)),
    db.select({ totaal: sum(trips.distanceKm) }).from(trips).where(eq(trips.userId, user.id)),
  ])

  const totaalKm = parseFloat(totaalResult[0]?.totaal ?? '0')
  const zakelijkeKm = rittenLijst
    .filter(r => r.isBusinessTrip)
    .reduce((sum, r) => sum + parseFloat(r.distanceKm), 0)
  const vergoeding = zakelijkeKm * 0.23

  const aantalOnbeoordeeld = rittenLijst.filter(r => !r.classifiedByAi).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ritregistratie</h2>
        <div className="flex items-center gap-3">
          <ClassificeerAllesKnop aantalOnbeoordeeld={aantalOnbeoordeeld} />
          <RitToevoegenForm />
        </div>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Totaal km (jaar)" waarde={`${totaalKm.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} km`} icon="📍" kleur="purple" />
        <StatCard label="Zakelijke km" waarde={`${zakelijkeKm.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} km`} icon="🏢" kleur="blue" />
        <StatCard label="Km-vergoeding" waarde={`€ ${vergoeding.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="€0,23 per km" icon="💰" kleur="green" />
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-[110px_1fr_1fr_70px_160px_120px_40px] gap-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <span>Datum</span>
          <span>Omschrijving</span>
          <span>Route</span>
          <span>Km</span>
          <span>Type</span>
          <span>Overschrijven</span>
          <span></span>
        </div>

        {rittenLijst.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Nog geen ritten. Klik op &ldquo;+ Rit toevoegen&rdquo; om te beginnen.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rittenLijst.map(rit => (
              <div
                key={rit.id}
                className="grid grid-cols-[110px_1fr_1fr_70px_160px_120px_40px] gap-3 px-4 py-3 items-center hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-600">{formatDatum(rit.startedAt)}</span>
                <span className="text-sm font-medium text-gray-900 truncate">{rit.description}</span>
                <span className="text-xs text-gray-500 truncate">
                  {rit.startAddress} → {rit.endAddress}
                </span>
                <span className="text-sm font-medium text-gray-900">{formatKm(rit.distanceKm)}</span>
                <RitClassificatieBadge
                  ritId={rit.id}
                  isZakelijk={rit.isBusinessTrip}
                  classifiedByAi={rit.classifiedByAi ?? false}
                  aiReason={rit.aiReason ?? null}
                  aiConfidence={rit.aiConfidence ?? null}
                />
                <RitOverrideKnoppen ritId={rit.id} isZakelijk={rit.isBusinessTrip} />
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
