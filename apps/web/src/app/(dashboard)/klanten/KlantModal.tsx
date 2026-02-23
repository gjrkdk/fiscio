'use client'

import { useState, useTransition, useRef } from 'react'
import { klantToevoegen, klantUpdaten } from './actions'
import type { Client } from '@fiscio/db'

type Props = { klant?: Client }

export function KlantModal({ klant }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const isEdit = !!klant

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        await klantUpdaten(klant.id, formData)
      } else {
        await klantToevoegen(formData)
      }
      setOpen(false)
      formRef.current?.reset()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={isEdit
          ? 'text-xs text-blue-600 hover:underline'
          : 'px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors'
        }
      >
        {isEdit ? 'Bewerken' : '+ Klant toevoegen'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEdit ? 'Klant bewerken' : 'Klant toevoegen'}
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {[
                { label: 'Naam', name: 'name', required: true, placeholder: 'Acme BV', defaultValue: klant?.name },
                { label: 'E-mailadres', name: 'email', placeholder: 'info@acme.nl', defaultValue: klant?.email },
                { label: 'Adres', name: 'address', placeholder: 'Hoofdstraat 1, Amsterdam', defaultValue: klant?.address },
                { label: 'KVK-nummer', name: 'kvkNumber', placeholder: '12345678', defaultValue: klant?.kvkNumber },
                { label: 'BTW-nummer', name: 'btwNumber', placeholder: 'NL123456789B01', defaultValue: klant?.btwNumber },
              ].map(({ label, name, required, placeholder, defaultValue }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    name={name} required={required} placeholder={placeholder}
                    defaultValue={defaultValue ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                <textarea
                  name="notes" rows={2} defaultValue={klant?.notes ?? ''}
                  placeholder="Interne notitie"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
                  Annuleren
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isPending ? 'Opslaan...' : isEdit ? 'Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
