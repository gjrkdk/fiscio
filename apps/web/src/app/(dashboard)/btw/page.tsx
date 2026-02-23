import { eq, and, gte, lte, sum } from 'drizzle-orm'
import { invoices, receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BtwKwartaalSelector } from './BtwKwartaalSelector'

function euro(val: string | number | null | undefined) {
  const n = typeof val === 'number' ? val : parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function kwartaalDatums(jaar: number, kwartaal: number) {
  const startMaand = (kwartaal - 1) * 3
  const start = new Date(jaar, startMaand, 1)
  const eind = new Date(jaar, startMaand + 3, 0, 23, 59, 59)
  return { start, eind }
}

type Props = {
  searchParams: Promise<{ jaar?: string; kwartaal?: string }>
}

export default async function BtwPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const jaar = parseInt(params.jaar ?? String(now.getFullYear()))
  const kwartaal = parseInt(params.kwartaal ?? String(Math.ceil((now.getMonth() + 1) / 3)))
  const { start, eind } = kwartaalDatums(jaar, kwartaal)

  // Omzet + BTW ontvangen (gefactureerd — sent of paid)
  const [factuurStats] = await db
    .select({
      omzet: sum(invoices.subtotal),
      btwOntvangen: sum(invoices.vatAmount),
      totaal: sum(invoices.total),
    })
    .from(invoices)
    .where(and(
      eq(invoices.userId, user.id),
      gte(invoices.createdAt, start),
      lte(invoices.createdAt, eind),
    ))

  // BTW betaald (op kosten/bonnetjes)
  const [kostenStats] = await db
    .select({
      kostenExcl: sum(receipts.amount),
      btwBetaald: sum(receipts.vatAmount),
    })
    .from(receipts)
    .where(and(
      eq(receipts.userId, user.id),
      gte(receipts.receiptDate, start),
      lte(receipts.receiptDate, eind),
    ))

  const omzet = parseFloat(factuurStats?.omzet ?? '0') || 0
  const btwOntvangen = parseFloat(factuurStats?.btwOntvangen ?? '0') || 0
  const kostenExcl = parseFloat(kostenStats?.kostenExcl ?? '0') || 0
  const btwBetaald = parseFloat(kostenStats?.btwBetaald ?? '0') || 0
  const saldo = btwOntvangen - btwBetaald // positief = te betalen, negatief = te ontvangen

  const kwartaalNaam = `Q${kwartaal} ${jaar}`
  const aangifteDeadline = [
    '', 'vóór 30 april', 'vóór 31 juli', 'vóór 31 oktober', 'vóór 31 januari',
  ][kwartaal] ?? ''

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">BTW-aangifte</h2>
          <p className="text-sm text-gray-500 mt-0.5">Kwartaaloverzicht voor de Belastingdienst</p>
        </div>
        <BtwKwartaalSelector jaar={jaar} kwartaal={kwartaal} />
      </div>

      {/* Deadline banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-amber-500 text-lg">📅</span>
        <div>
          <p className="text-sm font-medium text-amber-800">{kwartaalNaam} — aangifte {aangifteDeadline}</p>
          <p className="text-xs text-amber-600">Dien je aangifte in via Mijn Belastingdienst Zakelijk</p>
        </div>
      </div>

      {/* Omzetoverzicht */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Omzetoverzicht {kwartaalNaam}</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Omzet excl. BTW (1a)', value: omzet, desc: 'Totaal gefactureerd bedrag' },
            { label: 'Verschuldigde BTW (1b)', value: btwOntvangen, desc: 'BTW op uitgaande facturen' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{row.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{row.desc}</p>
              </div>
              <p className="text-lg font-bold text-gray-900 font-mono">{euro(row.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Voorbelasting */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Voorbelasting (aftrekbare BTW)</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Kosten excl. BTW', value: kostenExcl, desc: 'Totaal zakelijke uitgaven' },
            { label: 'Betaalde BTW (5b)', value: btwBetaald, desc: 'BTW op inkopen en kosten' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{row.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{row.desc}</p>
              </div>
              <p className="text-lg font-bold text-gray-900 font-mono">{euro(row.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Saldo */}
      <div className={`rounded-xl border-2 p-6 ${saldo > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${saldo > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {saldo > 0 ? 'Te betalen BTW (rubriek 5c)' : 'Te ontvangen BTW (teruggaaf)'}
            </p>
            <p className={`text-xs mt-0.5 ${saldo > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {saldo > 0
                ? `Verschuldigde BTW minus voorbelasting`
                : `Meer voorbelasting dan verschuldigde BTW`}
            </p>
          </div>
          <p className={`text-2xl font-bold font-mono ${saldo > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {euro(Math.abs(saldo))}
          </p>
        </div>
      </div>

      {/* Exportknop */}
      <a
        href={`/api/btw/export?jaar=${jaar}&kwartaal=${kwartaal}`}
        className="flex items-center gap-2 w-fit px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        ↓ Exporteren als CSV
      </a>
    </div>
  )
}
