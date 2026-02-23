import { eq, desc, sum } from 'drizzle-orm'
import { receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BonToevoegenModal } from './BonToevoegenModal'
import { BonVerwijderenKnop } from './BonVerwijderenKnop'

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kosten</h2>
          <p className="text-sm text-gray-500 mt-0.5">Bonnetjes en zakelijke uitgaven</p>
        </div>
        <BonToevoegenModal />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Totaal excl. BTW', value: euro(totaalExcl.toString()) },
          { label: 'Totaal BTW', value: euro(totaalBtw.toString()) },
          { label: 'Totaal incl. BTW', value: euro(totaalIncl.toString()), highlight: true },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`rounded-xl border p-4 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {bonnen.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🧾</p>
            <p className="font-medium text-gray-500">Nog geen bonnetjes</p>
            <p className="text-sm mt-1">Voeg je eerste uitgave toe</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Datum</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Leverancier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Categorie</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Omschrijving</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Excl. BTW</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">BTW</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Incl. BTW</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Foto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bonnen.map((bon) => {
                const excl = parseFloat(bon.amount ?? '0')
                const btw = parseFloat(bon.vatAmount ?? '0')
                const incl = excl + btw
                const datum = bon.receiptDate
                  ? new Date(bon.receiptDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '-'
                return (
                  <tr key={bon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{datum}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{bon.vendor}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {CATEGORIE_LABELS[bon.category ?? ''] ?? bon.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{bon.description ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{euro(excl.toString())}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {euro(btw.toString())}
                      <span className="text-xs text-gray-400 ml-1">({bon.vatRate}%)</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">{euro(incl.toString())}</td>
                    <td className="px-4 py-3 text-center">
                      {bon.imageUrl ? (
                        <a
                          href={`/api/kosten/foto?pad=${encodeURIComponent(bon.imageUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-base"
                          title="Bonnetje bekijken"
                        >
                          🧾
                        </a>
                      ) : (
                        <span className="text-gray-300 text-base">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
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
