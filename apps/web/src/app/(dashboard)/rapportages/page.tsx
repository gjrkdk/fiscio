import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { invoices, receipts, trips } from '@fiscio/db'
import { eq, and, gte, lt } from 'drizzle-orm'
import { Grafieken } from './Grafieken'

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const KWARTALEN = ['Q1 (jan–mrt)', 'Q2 (apr–jun)', 'Q3 (jul–sep)', 'Q4 (okt–dec)']

export default async function RapportagesPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { jaar: jaarParam } = await searchParams
  const jaar = parseInt(jaarParam ?? String(new Date().getFullYear()))
  const begin = new Date(jaar, 0, 1)
  const eind  = new Date(jaar + 1, 0, 1)

  const [factuurData, bonData, ritData] = await Promise.all([
    db.select().from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, begin), lt(invoices.createdAt, eind))),
    db.select().from(receipts)
      .where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, begin), lt(receipts.receiptDate, eind))),
    db.select().from(trips)
      .where(and(eq(trips.userId, user.id), gte(trips.startedAt, begin), lt(trips.startedAt, eind))),
  ])

  // ─── Omzet per maand ───────────────────────────────────────────────────
  const omzetPerMaand = Array.from({ length: 12 }, (_, i) => {
    const maandFacturen = factuurData.filter(f =>
      f.status !== 'draft' && new Date(f.createdAt).getMonth() === i
    )
    return {
      maand: MAANDEN[i]!,
      omzet: maandFacturen.reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0),
      btw:   maandFacturen.reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0),
    }
  })

  // ─── Kosten per categorie ──────────────────────────────────────────────
  const kostenPerCat = bonData.reduce<Record<string, number>>((acc, b) => {
    const cat = b.category ?? 'Overig'
    acc[cat] = (acc[cat] ?? 0) + parseFloat(b.amount ?? '0')
    return acc
  }, {})

  const kostenCategorieën = Object.entries(kostenPerCat)
    .map(([name, value]) => ({ name: naam(name), value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  // ─── Kosten per maand ─────────────────────────────────────────────────
  const kostenPerMaand = Array.from({ length: 12 }, (_, i) => {
    const maandBonnen = bonData.filter(b =>
      b.receiptDate && new Date(b.receiptDate).getMonth() === i
    )
    return {
      maand: MAANDEN[i]!,
      kosten: maandBonnen.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0),
    }
  })

  // ─── Gecombineerd per maand (omzet + kosten) ──────────────────────────
  const perMaand = omzetPerMaand.map((o, i) => ({
    maand: o.maand,
    omzet: Math.round(o.omzet),
    kosten: Math.round(kostenPerMaand[i]!.kosten),
    winst: Math.round(o.omzet - kostenPerMaand[i]!.kosten),
  }))

  // ─── Factuurstatus ────────────────────────────────────────────────────
  const factuurStatus = ['paid', 'sent', 'draft', 'overdue'].map(s => ({
    name: statusLabel(s),
    value: factuurData.filter(f => f.status === s).length,
    bedrag: factuurData.filter(f => f.status === s)
      .reduce((sum, f) => sum + parseFloat(f.total ?? '0'), 0),
  })).filter(s => s.value > 0)

  // ─── Kwartaaloverzicht ────────────────────────────────────────────────
  const kwartalen = [0, 1, 2, 3].map(q => {
    const startMaand = q * 3
    const qFacturen = factuurData.filter(f => {
      const m = new Date(f.createdAt).getMonth()
      return f.status !== 'draft' && m >= startMaand && m < startMaand + 3
    })
    const qBonnen = bonData.filter(b => {
      if (!b.receiptDate) return false
      const m = new Date(b.receiptDate).getMonth()
      return m >= startMaand && m < startMaand + 3
    })
    const omzet = qFacturen.reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
    const kosten = qBonnen.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
    return {
      kwartaal: KWARTALEN[q]!,
      omzet: Math.round(omzet),
      kosten: Math.round(kosten),
      winst: Math.round(omzet - kosten),
      btw: Math.round(qFacturen.reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0)),
    }
  })

  // ─── Samenvattende KPI's ──────────────────────────────────────────────
  const totaalOmzet  = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
  const totaalKosten = bonData.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
  const totaalBtw    = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0)
  const totaalKmZak  = ritData.filter(r => r.isBusinessTrip).reduce((s, r) => s + parseFloat(r.distanceKm ?? '0'), 0)
  const openstaand   = factuurData.filter(f => f.status === 'sent').reduce((s, f) => s + parseFloat(f.total ?? '0'), 0)

  const beschikbareJaren = [new Date().getFullYear(), new Date().getFullYear() - 1]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header + jaar selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Rapportages</h1>
          <p className="text-sm text-gray-500 mt-1">Financieel overzicht {jaar}</p>
        </div>
        <div className="flex gap-2">
          {beschikbareJaren.map(j => (
            <a
              key={j}
              href={`/rapportages?jaar=${j}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                j === jaar
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {j}
            </a>
          ))}
        </div>
      </div>

      {/* KPI kaarten */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiKaart label="Omzet" waarde={totaalOmzet} kleur="blue" prefix="€" />
        <KpiKaart label="Kosten" waarde={totaalKosten} kleur="red" prefix="€" />
        <KpiKaart label="Winst" waarde={totaalOmzet - totaalKosten} kleur="green" prefix="€" />
        <KpiKaart label="BTW afdracht" waarde={totaalBtw} kleur="purple" prefix="€" />
        <KpiKaart label="Zakelijke km" waarde={Math.round(totaalKmZak)} kleur="orange" suffix=" km" />
      </div>

      {/* Openstaand alert */}
      {openstaand > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-600 text-lg">⚠️</span>
          <p className="text-sm text-amber-800">
            <strong>€{Math.round(openstaand).toLocaleString('nl-NL')}</strong> aan openstaande facturen
          </p>
        </div>
      )}

      {/* Grafieken (client component) */}
      <Grafieken
        perMaand={perMaand}
        kostenCategorieën={kostenCategorieën}
        factuurStatus={factuurStatus}
      />

      {/* Kwartaaloverzicht tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Kwartaaloverzicht {jaar}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Kwartaal</th>
                <th className="px-6 py-3 text-right">Omzet</th>
                <th className="px-6 py-3 text-right">Kosten</th>
                <th className="px-6 py-3 text-right">Winst</th>
                <th className="px-6 py-3 text-right">BTW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kwartalen.map(kw => (
                <tr key={kw.kwartaal} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{kw.kwartaal}</td>
                  <td className="px-6 py-4 text-right text-gray-700">€{kw.omzet.toLocaleString('nl-NL')}</td>
                  <td className="px-6 py-4 text-right text-red-600">€{kw.kosten.toLocaleString('nl-NL')}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${kw.winst >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{kw.winst.toLocaleString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 text-right text-purple-600">€{kw.btw.toLocaleString('nl-NL')}</td>
                </tr>
              ))}
              {/* Totaalrij */}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-gray-900">Totaal {jaar}</td>
                <td className="px-6 py-4 text-right text-gray-900">€{Math.round(totaalOmzet).toLocaleString('nl-NL')}</td>
                <td className="px-6 py-4 text-right text-red-700">€{Math.round(totaalKosten).toLocaleString('nl-NL')}</td>
                <td className={`px-6 py-4 text-right ${(totaalOmzet - totaalKosten) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  €{Math.round(totaalOmzet - totaalKosten).toLocaleString('nl-NL')}
                </td>
                <td className="px-6 py-4 text-right text-purple-700">€{Math.round(totaalBtw).toLocaleString('nl-NL')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function KpiKaart({ label, waarde, kleur, prefix = '', suffix = '' }: {
  label: string; waarde: number; kleur: string; prefix?: string; suffix?: string
}) {
  const kleuren: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${kleuren[kleur] ?? kleuren['blue']}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">
        {prefix}{Math.abs(Math.round(waarde)).toLocaleString('nl-NL')}{suffix}
      </p>
    </div>
  )
}

function statusLabel(s: string) {
  return { paid: 'Betaald', sent: 'Openstaand', draft: 'Concept', overdue: 'Verlopen' }[s] ?? s
}

function naam(cat: string) {
  const map: Record<string, string> = {
    kantoor: 'Kantoor', software: 'Software', reizen: 'Reizen',
    marketing: 'Marketing', hardware: 'Hardware', overig: 'Overig',
  }
  return map[cat.toLowerCase()] ?? cat
}
