'use client'

import { useState, useTransition } from 'react'
import { slaUrenOp } from './actions'

export function UrenTracker({ huidigUren }: { huidigUren: number }) {
  const [uren, setUren] = useState(huidigUren)
  const [pending, startTransition] = useTransition()

  function opslaan() {
    startTransition(() => slaUrenOp(uren))
  }

  return (
    <div className="flex items-center gap-3 mt-4">
      <input
        type="number"
        min={0}
        max={3000}
        value={uren}
        onChange={e => setUren(Number(e.target.value))}
        className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-center"
      />
      <span className="text-sm text-gray-500">uur geregistreerd dit jaar</span>
      <button
        onClick={opslaan}
        disabled={pending}
        className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {pending ? 'Opslaan...' : 'Bijwerken'}
      </button>
    </div>
  )
}
