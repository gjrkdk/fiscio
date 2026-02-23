'use client'

import { useState, useTransition } from 'react'
import { factuurAanmaken } from '../actions'

type LineItem = {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
}

const UNITS = ['uur', 'dag', 'stuk', 'maand', 'km', 'vast']

const EMPTY_ITEM: LineItem = { description: '', quantity: 1, unit: 'uur', unitPrice: 0, vatRate: 21 }

function euro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function calcTotals(items: LineItem[]) {
  let subtotal = 0, vatAmount = 0
  for (const item of items) {
    const line = item.quantity * item.unitPrice
    subtotal += line
    vatAmount += line * item.vatRate / 100
  }
  return { subtotal, vatAmount, total: subtotal + vatAmount }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, name, type = 'text', placeholder, required, defaultValue }: {
  label: string; name: string; type?: string
  placeholder?: string; required?: boolean; defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        name={name} type={type} required={required}
        placeholder={placeholder} defaultValue={defaultValue}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export function NieuwFactuurForm() {
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])

  const today = new Date().toISOString().split('T')[0]!
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!

  const { subtotal, vatAmount, total } = calcTotals(items)

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleSubmit(formData: FormData) {
    formData.set('lineItems', JSON.stringify(items))
    startTransition(() => factuurAanmaken(formData))
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Klantgegevens */}
      <Section title="Klantgegevens">
        <Field label="Bedrijfs- of klantnaam" name="clientName" required placeholder="Acme BV" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="E-mailadres" name="clientEmail" type="email" placeholder="factuur@klant.nl" />
          <Field label="KVK-nummer" name="clientKvk" placeholder="12345678" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="BTW-nummer" name="clientBtw" placeholder="NL123456789B01" />
          <Field label="Adres" name="clientAddress" placeholder="Hoofdstraat 1, Amsterdam" />
        </div>
      </Section>

      {/* Datums */}
      <Section title="Factuurgegevens">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Factuurdatum" name="invoiceDate" type="date" required defaultValue={today} />
          <Field label="Vervaldatum" name="dueDate" type="date" required defaultValue={in30} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Optionele notitie op de factuur"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </Section>

      {/* Regelitems */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Regelitems</h3>

        <div className="space-y-2 mb-3">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
            <span className="col-span-4">Omschrijving</span>
            <span className="col-span-1 text-right">Aantal</span>
            <span className="col-span-2">Eenheid</span>
            <span className="col-span-2 text-right">Tarief</span>
            <span className="col-span-2 text-right">BTW</span>
            <span className="col-span-1"></span>
          </div>

          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                value={item.description}
                onChange={e => updateItem(i, 'description', e.target.value)}
                placeholder="Dienst of product"
                required
                className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number" min="0.01" step="0.01"
                value={item.quantity || ''}
                onChange={e => updateItem(i, 'quantity', +e.target.value)}
                className="col-span-1 px-2 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={item.unit}
                onChange={e => updateItem(i, 'unit', e.target.value)}
                className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <div className="col-span-2 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                <input
                  type="number" min="0" step="0.01"
                  value={item.unitPrice || ''}
                  onChange={e => updateItem(i, 'unitPrice', +e.target.value)}
                  className="w-full pl-5 pr-2 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={item.vatRate}
                onChange={e => updateItem(i, 'vatRate', +e.target.value)}
                className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>0%</option>
                <option value={9}>9%</option>
                <option value={21}>21%</option>
              </select>
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                className="col-span-1 text-gray-300 hover:text-red-500 disabled:opacity-0 text-lg leading-none transition-colors"
              >×</button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="text-sm text-blue-600 hover:underline"
        >
          + Regel toevoegen
        </button>

        {/* Totalen */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotaal excl. BTW</span>
            <span className="font-mono">{euro(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>BTW</span>
            <span className="font-mono">{euro(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-bold text-base pt-1">
            <span>Totaal incl. BTW</span>
            <span className="font-mono">{euro(total)}</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Opslaan...' : 'Factuur opslaan'}
        </button>
        <a
          href="/facturen"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuleren
        </a>
      </div>
    </form>
  )
}
