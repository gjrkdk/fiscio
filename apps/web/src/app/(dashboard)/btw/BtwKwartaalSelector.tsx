'use client'

import { useRouter, usePathname } from 'next/navigation'

const JAREN = [2024, 2025, 2026, 2027]
const KWARTALEN = [
  { value: 1, label: 'Q1 (jan–mrt)' },
  { value: 2, label: 'Q2 (apr–jun)' },
  { value: 3, label: 'Q3 (jul–sep)' },
  { value: 4, label: 'Q4 (okt–dec)' },
]

export function BtwKwartaalSelector({ jaar, kwartaal }: { jaar: number; kwartaal: number }) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(newJaar: number, newKwartaal: number) {
    router.push(`${pathname}?jaar=${newJaar}&kwartaal=${newKwartaal}`)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={jaar}
        onChange={e => navigate(+e.target.value, kwartaal)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {JAREN.map(j => <option key={j} value={j}>{j}</option>)}
      </select>
      <select
        value={kwartaal}
        onChange={e => navigate(jaar, +e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {KWARTALEN.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
      </select>
    </div>
  )
}
