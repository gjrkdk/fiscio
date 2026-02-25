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

  const colGrid = '110px 1fr 1fr 70px 180px 130px 40px'
  const thStyle = { fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.60 0.01 255)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Ritregistratie</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClassificeerAllesKnop aantalOnbeoordeeld={aantalOnbeoordeeld} />
          <RitToevoegenForm />
        </div>
      </div>

      {/* Statistieken */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <StatCard label="Totaal km (jaar)" waarde={`${totaalKm.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} km`} icon="📍" kleur="purple" />
        <StatCard label="Zakelijke km" waarde={`${zakelijkeKm.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} km`} icon="🏢" kleur="blue" />
        <StatCard label="Km-vergoeding" waarde={`€ ${vergoeding.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="€0,23 per km" icon="💰" kleur="green" />
      </div>

      {/* Tabel */}
      <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)', overflow: 'hidden' }}>
        {/* Tabel header */}
        <div style={{ display: 'grid', gridTemplateColumns: colGrid, gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid oklch(0.95 0.005 255)', background: 'oklch(0.98 0.003 255)' }}>
          {['Datum', 'Omschrijving', 'Route', 'Km', 'Type', 'Overschrijven', ''].map(h => (
            <span key={h} style={thStyle}>{h}</span>
          ))}
        </div>

        {rittenLijst.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', fontSize: '0.875rem', color: 'oklch(0.60 0.01 255)' }}>
            Nog geen ritten. Klik op &ldquo;+ Rit toevoegen&rdquo; om te beginnen.
          </div>
        ) : rittenLijst.map(rit => (
          <div key={rit.id} style={{ display: 'grid', gridTemplateColumns: colGrid, gap: '0.75rem', padding: '0.875rem 1.25rem', alignItems: 'center', borderBottom: '1px solid oklch(0.97 0.003 255)' }}>
            <span style={{ fontSize: '0.825rem', color: 'oklch(0.50 0.015 255)' }}>{formatDatum(rit.startedAt)}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.20 0.02 255)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rit.description}</span>
            <span style={{ fontSize: '0.78rem', color: 'oklch(0.55 0.015 255)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rit.startAddress} → {rit.endAddress}
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)' }}>{formatKm(rit.distanceKm)}</span>
            <RitClassificatieBadge
              ritId={rit.id}
              isZakelijk={rit.isBusinessTrip}
              classifiedByAi={rit.classifiedByAi ?? false}
              aiReason={rit.aiReason ?? null}
              aiConfidence={rit.aiConfidence ?? null}
            />
            <RitOverrideKnoppen ritId={rit.id} isZakelijk={rit.isBusinessTrip} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <RitVerwijderenButton id={rit.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
