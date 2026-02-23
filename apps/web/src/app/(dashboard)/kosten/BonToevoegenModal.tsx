'use client'

import { useState, useTransition, useRef } from 'react'
import { bonToevoegen } from './actions'

const CATEGORIEËN = [
  { value: 'kantoor', label: 'Kantoor' },
  { value: 'reizen', label: 'Reizen' },
  { value: 'software', label: 'Software' },
  { value: 'maaltijden', label: 'Maaltijden' },
  { value: 'abonnement', label: 'Abonnement' },
  { value: 'overig', label: 'Overig' },
]

const BTW_TARIEVEN = [
  { value: '0', label: '0% (vrijgesteld)' },
  { value: '9', label: '9% (laag tarief)' },
  { value: '21', label: '21% (hoog tarief)' },
]

export function BonToevoegenModal() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [bedrag, setBedrag] = useState('')
  const [vatRate, setVatRate] = useState('21')
  const formRef = useRef<HTMLFormElement>(null)

  const btwBedrag = bedrag && !isNaN(+bedrag)
    ? (+bedrag * +vatRate / 100).toFixed(2)
    : '0.00'
  const inclBedrag = bedrag && !isNaN(+bedrag)
    ? (+bedrag + +btwBedrag).toFixed(2)
    : '0.00'

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await bonToevoegen(formData)
      setOpen(false)
      formRef.current?.reset()
      setBedrag('')
      setVatRate('21')
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Bon toevoegen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Bon toevoegen</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {/* Leverancier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leverancier <span className="text-red-500">*</span>
                </label>
                <input
                  name="vendor"
                  type="text"
                  required
                  placeholder="Bijv. Albert Heijn, AWS, NS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Datum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum <span className="text-red-500">*</span>
                </label>
                <input
                  name="receiptDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bedrag + BTW */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrag excl. BTW <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={bedrag}
                      onChange={e => setBedrag(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BTW tarief</label>
                  <select
                    name="vatRate"
                    value={vatRate}
                    onChange={e => setVatRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BTW_TARIEVEN.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BTW preview */}
              {bedrag && +bedrag > 0 && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 flex justify-between">
                  <span>BTW: € {btwBedrag}</span>
                  <span className="font-medium">Incl. BTW: € {inclBedrag}</span>
                </div>
              )}

              {/* Categorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorie <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  defaultValue=""
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Selecteer categorie</option>
                  {CATEGORIEËN.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Omschrijving */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                <input
                  name="description"
                  type="text"
                  placeholder="Optioneel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Opslaan...' : 'Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
