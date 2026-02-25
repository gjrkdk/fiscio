'use client'

import { useState, useTransition } from 'react'
import { factuurAanmaken } from '../actions'
import type { Client } from '@fiscio/db'

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

const sectionStyle = {
  background: 'white', borderRadius: '1rem',
  border: '1px solid oklch(0.91 0.01 255)',
  boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)',
  padding: '1.25rem',
}

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1.5px solid oklch(0.88 0.01 255)',
  borderRadius: '0.5rem', fontSize: '0.875rem',
  outline: 'none', color: 'oklch(0.20 0.02 255)',
  background: 'white', fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block' as const, fontSize: '0.8rem', fontWeight: 600 as const,
  color: 'oklch(0.40 0.02 255)', marginBottom: '0.375rem',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)', margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, name, type = 'text', placeholder, required, defaultValue }: {
  label: string; name: string; type?: string
  placeholder?: string; required?: boolean; defaultValue?: string | null | undefined
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: 'oklch(0.50 0.20 25)' }}>*</span>}
      </label>
      <input
        name={name} type={type} required={required}
        placeholder={placeholder} defaultValue={defaultValue ?? ''}
        style={inputStyle}
      />
    </div>
  )
}

type Props = { klanten?: Client[] }

export function NieuwFactuurForm({ klanten = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])
  const [selectedKlant, setSelectedKlant] = useState<Client | null>(null)

  function selecteerKlant(id: string) {
    const klant = klanten.find(k => k.id === id) ?? null
    setSelectedKlant(klant)
  }

  const today = new Date().toISOString().split('T')[0]!
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!
  const { subtotal, vatAmount, total } = calcTotals(items)

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function handleSubmit(formData: FormData) {
    formData.set('lineItems', JSON.stringify(items))
    startTransition(() => factuurAanmaken(formData))
  }

  return (
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Klantgegevens */}
      <Section title="👤 Klantgegevens" key={selectedKlant?.id ?? 'manual'}>
        {klanten.length > 0 && (
          <div>
            <label style={labelStyle}>Opgeslagen klant</label>
            <select onChange={e => selecteerKlant(e.target.value)} defaultValue="" style={inputStyle}>
              <option value="">— Selecteer klant of vul handmatig in —</option>
              {klanten.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
        )}
        <Field label="Bedrijfs- of klantnaam" name="clientName" required placeholder="Acme BV" defaultValue={selectedKlant?.name} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Field label="E-mailadres" name="clientEmail" type="email" placeholder="factuur@klant.nl" defaultValue={selectedKlant?.email} />
          <Field label="KVK-nummer" name="clientKvk" placeholder="12345678" defaultValue={selectedKlant?.kvkNumber} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Field label="BTW-nummer" name="clientBtw" placeholder="NL123456789B01" defaultValue={selectedKlant?.btwNumber} />
          <Field label="Adres" name="clientAddress" placeholder="Hoofdstraat 1, Amsterdam" defaultValue={selectedKlant?.address} />
        </div>
      </Section>

      {/* Factuurgegevens */}
      <Section title="📅 Factuurgegevens">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Field label="Factuurdatum" name="invoiceDate" type="date" required defaultValue={today} />
          <Field label="Vervaldatum" name="dueDate" type="date" required defaultValue={in30} />
        </div>
        <div>
          <label style={labelStyle}>Notities</label>
          <textarea
            name="notes" rows={2} placeholder="Optionele notitie op de factuur"
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>
      </Section>

      {/* Regelitems */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'oklch(0.20 0.02 255)', margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          📋 Regelitems
        </h3>

        {/* Kolom header */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1.5fr 1fr 28px', gap: '0.5rem', padding: '0 0 0.5rem', marginBottom: '0.25rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          {['Omschrijving', 'Aantal', 'Eenheid', 'Tarief', 'BTW', ''].map(h => (
            <span key={h} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.60 0.01 255)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: h === 'Aantal' || h === 'Tarief' ? 'right' : 'left' } as React.CSSProperties}>{h}</span>
          ))}
        </div>

        {/* Regels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1.5fr 1fr 28px', gap: '0.5rem', alignItems: 'center' }}>
              <input
                value={item.description}
                onChange={e => updateItem(i, 'description', e.target.value)}
                placeholder="Dienst of product" required
                style={inputStyle}
              />
              <input
                type="number" min="0.01" step="0.01"
                value={item.quantity || ''}
                onChange={e => updateItem(i, 'quantity', +e.target.value)}
                style={{ ...inputStyle, textAlign: 'right' }}
              />
              <select value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} style={inputStyle}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'oklch(0.60 0.01 255)', pointerEvents: 'none' }}>€</span>
                <input
                  type="number" min="0" step="0.01"
                  value={item.unitPrice || ''}
                  onChange={e => updateItem(i, 'unitPrice', +e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '1.5rem', textAlign: 'right' }}
                />
              </div>
              <select value={item.vatRate} onChange={e => updateItem(i, 'vatRate', +e.target.value)} style={inputStyle}>
                <option value={0}>0%</option>
                <option value={9}>9%</option>
                <option value={21}>21%</option>
              </select>
              <button
                type="button"
                onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                disabled={items.length === 1}
                style={{ background: 'none', border: 'none', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: 'oklch(0.70 0.01 255)', fontSize: '1.25rem', lineHeight: 1, padding: 0, opacity: items.length === 1 ? 0.2 : 1, fontFamily: 'inherit' }}
              >×</button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'oklch(0.52 0.21 255)', padding: 0, fontFamily: 'inherit' }}
        >
          + Regel toevoegen
        </button>

        {/* Totalen */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid oklch(0.93 0.005 255)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'oklch(0.50 0.015 255)' }}>
            <span>Subtotaal excl. BTW</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'oklch(0.50 0.015 255)' }}>
            <span>BTW</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(vatAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: 'oklch(0.13 0.02 255)', borderTop: '2px solid oklch(0.88 0.01 255)', paddingTop: '0.625rem', marginTop: '0.125rem' }}>
            <span>Totaal incl. BTW</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(total)}</span>
          </div>
        </div>
      </div>

      {/* Knoppen */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '0.625rem 1.5rem', background: 'oklch(0.52 0.21 255)', color: 'white',
            border: 'none', borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1,
            fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(0.52 0.21 255 / 0.25)',
          }}
        >
          {isPending ? 'Opslaan...' : 'Factuur opslaan'}
        </button>
        <a href="/facturen" style={{
          padding: '0.625rem 1.25rem', border: '1.5px solid oklch(0.88 0.01 255)',
          borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600,
          color: 'oklch(0.40 0.02 255)', textDecoration: 'none', background: 'white',
        }}>
          Annuleren
        </a>
      </div>
    </form>
  )
}
