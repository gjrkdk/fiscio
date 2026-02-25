'use client'

import { useTransition, useState } from 'react'
import { instellingenOpslaan } from './actions'
import type { User } from '@fiscio/db'

type Props = {
  profiel: User | null
  email: string
}

const inputStyle = {
  width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid oklch(0.88 0.01 255)',
  borderRadius: '0.625rem', fontSize: '0.875rem', outline: 'none', background: 'white',
  color: 'oklch(0.20 0.02 255)', fontFamily: 'inherit', boxSizing: 'border-box' as const,
}

function Field({ label, name, defaultValue, placeholder, required, hint, pattern }: {
  label: string; name: string; defaultValue?: string | null | undefined
  placeholder?: string; required?: boolean; hint?: string; pattern?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'oklch(0.35 0.02 255)', marginBottom: '0.375rem' }}>
        {label} {required && <span style={{ color: 'oklch(0.50 0.20 25)' }}>*</span>}
      </label>
      <input
        name={name} type="text" defaultValue={defaultValue ?? ''}
        placeholder={placeholder} required={required} pattern={pattern}
        style={inputStyle}
      />
      {hint && <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'oklch(0.60 0.01 255)' }}>{hint}</p>}
    </div>
  )
}

const sectionStyle = {
  background: 'white', borderRadius: '1rem',
  border: '1px solid oklch(0.91 0.01 255)',
  boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)',
  padding: '1.25rem',
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
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Persoonlijk */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)', margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          👤 Persoonlijk
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'oklch(0.35 0.02 255)', marginBottom: '0.375rem' }}>
              E-mailadres
            </label>
            <input type="email" value={email} disabled style={{ ...inputStyle, background: 'oklch(0.97 0.003 255)', color: 'oklch(0.60 0.01 255)', cursor: 'not-allowed' }} />
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'oklch(0.60 0.01 255)' }}>E-mailadres is niet aanpasbaar</p>
          </div>
          <Field label="Volledige naam" name="fullName" defaultValue={profiel?.fullName} placeholder="Jan de Vries" required />
        </div>
      </div>

      {/* Bedrijf */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)', margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          🏢 Bedrijf
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Bedrijfsnaam" name="companyName" defaultValue={profiel?.companyName} placeholder="De Vries Consultancy" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="KVK-nummer" name="kvkNumber" defaultValue={profiel?.kvkNumber} placeholder="12345678" hint="8 cijfers" pattern="[0-9]{8}" />
            <Field label="BTW-nummer" name="btwNumber" defaultValue={profiel?.btwNumber} placeholder="NL123456789B01" hint="Bijv. NL123456789B01" />
          </div>
          <Field label="IBAN" name="iban" defaultValue={profiel?.iban} placeholder="NL91 ABNA 0417 1643 00" hint="Bankrekeningnummer voor facturen" />
        </div>
      </div>

      {/* Adres */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)', margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          📍 Adres
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Straat en huisnummer" name="address" defaultValue={profiel?.address} placeholder="Hoofdstraat 1" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Postcode" name="zipCode" defaultValue={profiel?.zipCode} placeholder="1234 AB" />
            <Field label="Stad" name="city" defaultValue={profiel?.city} placeholder="Amsterdam" />
          </div>
        </div>
      </div>

      {/* Opslaan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button type="submit" disabled={isPending} style={{
          padding: '0.625rem 1.5rem', background: 'oklch(0.52 0.21 255)', color: 'white',
          border: 'none', borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 700,
          cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
          fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(0.52 0.21 255 / 0.25)',
        }}>
          {isPending ? 'Opslaan...' : 'Instellingen opslaan'}
        </button>
        {saved && (
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.35 0.18 145)' }}>
            ✓ Opgeslagen
          </span>
        )}
      </div>
    </form>
  )
}
