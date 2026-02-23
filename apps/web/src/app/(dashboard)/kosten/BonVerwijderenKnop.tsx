'use client'

import { useTransition } from 'react'
import { bonVerwijderen } from './actions'

export function BonVerwijderenKnop({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        if (!confirm('Bon verwijderen?')) return
        startTransition(() => bonVerwijderen(id))
      }}
      disabled={isPending}
      className="text-gray-300 hover:text-red-500 disabled:opacity-50 transition-colors text-lg leading-none"
      title="Verwijderen"
    >
      {isPending ? '…' : '×'}
    </button>
  )
}
