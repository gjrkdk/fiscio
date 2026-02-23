'use client'

import { useTransition, useState } from 'react'
import { instellingenOpslaan } from './actions'
import type { User } from '@fiscio/db'

type Props = {
  profiel: User | null
  email: string
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  hint,
  pattern,
}: {
  label: string
  name: string
  defaultValue?: string | null | undefined
  placeholder?: string
  required?: boolean
  hint?: string
  pattern?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        pattern={pattern}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export function InstellingenForm({ profiel, email }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(formData: FormData) {
    setSaved(false)
    startTransition(async () => {
      await instellingenOpslaan(formData)
      setSaved(true)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Persoonlijk */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Persoonlijk</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mailadres
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-400">E-mailadres is niet aanpasbaar</p>
        </div>

        <Field
          label="Volledige naam"
          name="fullName"
          defaultValue={profiel?.fullName}
          placeholder="Jan de Vries"
          required
        />
      </div>

      {/* Bedrijf */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Bedrijf</h3>

        <Field
          label="Bedrijfsnaam"
          name="companyName"
          defaultValue={profiel?.companyName}
          placeholder="De Vries Consultancy"
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="KVK-nummer"
            name="kvkNumber"
            defaultValue={profiel?.kvkNumber}
            placeholder="12345678"
            hint="8 cijfers"
            pattern="[0-9]{8}"
          />
          <Field
            label="BTW-nummer"
            name="btwNumber"
            defaultValue={profiel?.btwNumber}
            placeholder="NL123456789B01"
            hint="Bijv. NL123456789B01"
          />
        </div>

        <Field
          label="IBAN"
          name="iban"
          defaultValue={profiel?.iban}
          placeholder="NL91 ABNA 0417 1643 00"
          hint="Bankrekeningnummer voor facturen"
        />
      </div>

      {/* Adres */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Adres</h3>

        <Field
          label="Straat en huisnummer"
          name="address"
          defaultValue={profiel?.address}
          placeholder="Hoofdstraat 1"
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Postcode"
            name="zipCode"
            defaultValue={profiel?.zipCode}
            placeholder="1234 AB"
          />
          <Field
            label="Stad"
            name="city"
            defaultValue={profiel?.city}
            placeholder="Amsterdam"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Opslaan...' : 'Instellingen opslaan'}
        </button>

        {saved && (
          <span className="text-sm text-green-600 font-medium">
            ✓ Opgeslagen
          </span>
        )}
      </div>
    </form>
  )
}
