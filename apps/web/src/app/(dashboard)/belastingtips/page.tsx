import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { invoices, receipts, users } from '@fiscio/db'
import { eq, and, gte } from 'drizzle-orm'
import { berekenTips, type BelastingTip, type TipStatus, BELASTING_PARAMS } from '@/lib/belastingtips'
import { UrenTracker } from './UrenTracker'

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS: Record<TipStatus, { label: string; kleur: string; bg: string; border: string }> = {
  kans:      { label: '💡 Kans',       kleur: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  aandacht:  { label: '⚠️ Aandacht',   kleur: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  op_koers:  { label: '✅ Op koers',   kleur: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  nvt:       { label: 'Niet van toepassing', kleur: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
}

// ─── Tip-kaart ──────────────────────────────────────────────────────────────
function TipKaart({ tip, urenHuidigJaar }: { tip: BelastingTip; urenHuidigJaar: number }) {
  const s = STATUS[tip.status]!
  return (
    <div className={`rounded-2xl border ${s.border} ${s.bg} p-6`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${s.bg} ${s.kleur} border ${s.border}`}>
            {s.label}
          </span>
          <h3 className="text-base font-bold text-gray-900">{tip.titel}</h3>
        </div>
        {tip.impact !== null && tip.impact > 0 && (
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">Besparing</div>
            <div className="text-xl font-bold text-green-600">
              €{tip.impact.toLocaleString('nl-NL')}
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{tip.uitleg}</p>

      {/* Urencriterium: toon uren-tracker */}
      {tip.id === 'urencriterium' && (
        <UrenTracker huidigUren={urenHuidigJaar} />
      )}

      {tip.actie && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-current border-opacity-10">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actie:</span>
          <span className="text-sm text-gray-700">{tip.actie}</span>
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

  // Data ophalen
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

  const kostenJaar = kostenData
    .reduce((s, r) => s + parseFloat(r.amount ?? '0'), 0)

  // Investeringen: kantoor + software bonnen (proxy voor bedrijfsmiddelen)
  const investeerdbedragJaar = kostenData
    .filter(r => ['kantoor', 'software'].includes(r.category ?? ''))
    .reduce((s, r) => s + parseFloat(r.amount ?? '0'), 0)

  const gebruiker = gebruikerData[0]
  const urenGeregistreerd = gebruiker?.urenHuidigJaar ?? 0

  const data = berekenTips({ omzetJaar, kostenJaar, investeerdbedragJaar, urenGeregistreerd })
  const aantalKansen = data.tips.filter(t => t.status === 'kans' || t.status === 'aandacht').length

  // Sorteer: aandacht eerst, dan kans, dan op_koers, dan nvt
  const volgorde: TipStatus[] = ['aandacht', 'kans', 'op_koers', 'nvt']
  const gesorteerd = [...data.tips].sort(
    (a, b) => volgorde.indexOf(a.status) - volgorde.indexOf(b.status)
  )

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Belastingtips</h1>
        <p className="text-sm text-gray-500">
          Gebaseerd op jouw data van {nu.getFullYear()} — automatisch bijgewerkt.
        </p>
      </div>

      {/* Samenvatting */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Omzet {nu.getFullYear()}</div>
          <div className="text-xl font-bold text-gray-900">
            €{Math.round(data.omzetJaar).toLocaleString('nl-NL')}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Geschatte winst</div>
          <div className="text-xl font-bold text-gray-900">
            €{Math.round(data.winstJaar).toLocaleString('nl-NL')}
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-xs text-green-700 mb-1">Potentiële besparing</div>
          <div className="text-xl font-bold text-green-700">
            €{data.totaalPotentieel.toLocaleString('nl-NL')}
          </div>
        </div>
      </div>

      {/* Voortgang urencriterium */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Urencriterium — {urenGeregistreerd} / {BELASTING_PARAMS.uren_drempel} uur
          </span>
          <span className="text-xs text-gray-400">
            Dag {data.dagenVerstreken} / {data.dagenInJaar} van {nu.getFullYear()}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              urenGeregistreerd >= BELASTING_PARAMS.uren_drempel ? 'bg-green-500' :
              urenGeregistreerd > BELASTING_PARAMS.uren_drempel * 0.7 ? 'bg-blue-500' : 'bg-amber-400'
            }`}
            style={{ width: `${Math.min(100, (urenGeregistreerd / BELASTING_PARAMS.uren_drempel) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Dagpace nodig: {data.dagenInJaar - data.dagenVerstreken > 0
            ? ((BELASTING_PARAMS.uren_drempel - urenGeregistreerd) / (data.dagenInJaar - data.dagenVerstreken)).toFixed(1)
            : '0'} uur/dag
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-4">
        {aantalKansen === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🎉</div>
            <div className="font-semibold text-gray-700">Alles op orde!</div>
            <div className="text-sm">Geen directe aandachtspunten gevonden.</div>
          </div>
        )}
        {gesorteerd.map(tip => (
          <TipKaart key={tip.id} tip={tip} urenHuidigJaar={urenGeregistreerd} />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 mt-8 text-center">
        Deze tips zijn indicatief op basis van jouw geregistreerde data. Raadpleeg een belastingadviseur voor persoonlijk advies.
        Bedragen gebaseerd op belastingregels {nu.getFullYear()}.
      </p>
    </div>
  )
}
