import { eq, and } from 'drizzle-orm'
import { invoices, users } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '../StatusBadge'
import { FactuurActies } from './FactuurActies'
import type { InvoiceLineItem } from '@fiscio/db'

function euro(val: string | number | null | undefined) {
  const n = typeof val === 'number' ? val : parseFloat(val ?? '0')
  return isNaN(n) ? '€ 0,00' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default async function FactuurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
    .limit(1)

  if (!factuur) notFound()

  const [profiel] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const datum = factuur.createdAt
    ? new Date(factuur.createdAt).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-'
  const verval = factuur.dueDate
    ? new Date(factuur.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-'

  const lineItems = (factuur.lineItems ?? []) as InvoiceLineItem[]

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/facturen" className="text-gray-400 hover:text-gray-600 text-sm">← Facturen</Link>
          <StatusBadge status={factuur.status} />
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/facturen/${factuur.id}/pdf`}
            target="_blank"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↓ PDF
          </a>
          <FactuurActies factuurId={factuur.id} status={factuur.status} />
        </div>
      </div>

      {/* Factuur preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
        {/* Kop */}
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-2xl text-gray-900">{profiel?.companyName ?? profiel?.fullName ?? 'Jouw bedrijf'}</p>
            {profiel?.address && <p className="text-sm text-gray-500 mt-1">{profiel.address}</p>}
            {profiel?.zipCode && <p className="text-sm text-gray-500">{profiel.zipCode} {profiel.city}</p>}
            {profiel?.kvkNumber && <p className="text-sm text-gray-500 mt-1">KVK: {profiel.kvkNumber}</p>}
            {profiel?.btwNumber && <p className="text-sm text-gray-500">BTW: {profiel.btwNumber}</p>}
            {profiel?.iban && <p className="text-sm text-gray-500">IBAN: {profiel.iban}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">FACTUUR</p>
            <p className="font-mono text-gray-700 mt-1">{factuur.invoiceNumber}</p>
            <p className="text-sm text-gray-500 mt-2">Datum: {datum}</p>
            <p className="text-sm text-gray-500">Vervaldatum: {verval}</p>
          </div>
        </div>

        {/* Klant */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Factuur aan</p>
          <p className="font-semibold text-gray-900">{factuur.clientName}</p>
          {factuur.clientAddress && <p className="text-sm text-gray-600">{factuur.clientAddress}</p>}
          {factuur.clientEmail && <p className="text-sm text-gray-600">{factuur.clientEmail}</p>}
          {factuur.clientKvk && <p className="text-sm text-gray-500">KVK: {factuur.clientKvk}</p>}
          {factuur.clientBtw && <p className="text-sm text-gray-500">BTW: {factuur.clientBtw}</p>}
        </div>

        {/* Regelitems */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-gray-700">Omschrijving</th>
              <th className="text-right py-2 text-gray-700">Aantal</th>
              <th className="text-left py-2 pl-2 text-gray-700">Eenh.</th>
              <th className="text-right py-2 text-gray-700">Tarief</th>
              <th className="text-right py-2 text-gray-700">BTW</th>
              <th className="text-right py-2 text-gray-700">Totaal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineItems.map((item, i) => {
              const lineTotal = item.quantity * item.unitPrice
              return (
                <tr key={i}>
                  <td className="py-2.5 text-gray-900">{item.description}</td>
                  <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2.5 pl-2 text-gray-500 text-xs">{item.unit ?? 'stuk'}</td>
                  <td className="py-2.5 text-right font-mono text-gray-600">{euro(item.unitPrice)}</td>
                  <td className="py-2.5 text-right text-gray-500">{item.vatRate}%</td>
                  <td className="py-2.5 text-right font-mono font-medium text-gray-900">{euro(lineTotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totalen */}
        <div className="space-y-1.5 text-sm ml-auto max-w-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotaal excl. BTW</span>
            <span className="font-mono">{euro(factuur.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>BTW</span>
            <span className="font-mono">{euro(factuur.vatAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-bold text-base border-t border-gray-200 pt-2">
            <span>Totaal incl. BTW</span>
            <span className="font-mono">{euro(factuur.total)}</span>
          </div>
        </div>

        {/* Notities */}
        {factuur.notes && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notities</p>
            <p className="text-sm text-gray-600">{factuur.notes}</p>
          </div>
        )}

        {/* Betaalinfo */}
        {profiel?.iban && (
          <div className="border-t border-gray-100 pt-4 text-sm text-gray-500">
            <p>Gelieve te betalen voor <strong className="text-gray-700">{verval}</strong> op rekeningnummer <strong className="text-gray-700">{profiel.iban}</strong></p>
            <p>o.v.v. factuurnummer <strong className="text-gray-700">{factuur.invoiceNumber}</strong></p>
          </div>
        )}
      </div>
    </div>
  )
}
