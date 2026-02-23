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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Facturen</h2>
          {openstaand.length > 0 && (
            <p className="text-sm text-amber-600 mt-0.5">
              {openstaand.length} openstaande factuur{openstaand.length !== 1 ? 'en' : ''} · {euro(totaalOpenstaand.toString())}
            </p>
          )}
        </div>
        <Link
          href="/facturen/nieuw"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nieuwe factuur
        </Link>
      </div>

      {/* Lijst */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {facturen.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📄</p>
            <p className="font-medium text-gray-500">Nog geen facturen</p>
            <p className="text-sm mt-1">Maak je eerste factuur aan</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nummer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Klant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Datum</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Vervaldatum</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Bedrag</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {facturen.map(f => {
                const datum = f.createdAt
                  ? new Date(f.createdAt).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '-'
                const verval = f.dueDate
                  ? new Date(f.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '-'
                const isVervallen = f.status === 'sent' && f.dueDate && new Date(f.dueDate) < new Date()
                return (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700">{f.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{f.clientName}</td>
                    <td className="px-4 py-3 text-gray-500">{datum}</td>
                    <td className={`px-4 py-3 ${isVervallen ? 'text-red-500 font-medium' : 'text-gray-500'}`}>{verval}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">{euro(f.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/facturen/${f.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
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
