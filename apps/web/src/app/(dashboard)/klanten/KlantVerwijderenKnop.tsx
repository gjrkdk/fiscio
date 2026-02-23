'use client'

import { useTransition } from 'react'
import { klantVerwijderen } from './actions'

export function KlantVerwijderenKnop({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() => {
        if (!confirm('Klant verwijderen?')) return
        startTransition(() => klantVerwijderen(id))
      }}
      disabled={isPending}
      className="text-gray-300 hover:text-red-500 disabled:opacity-50 text-lg leading-none transition-colors"
    >
      {isPending ? '…' : '×'}
    </button>
  )
}
