'use client'

import { useTransition } from 'react'
import { ritVerwijderen } from '@/app/(dashboard)/ritten/actions'

export function RitVerwijderenButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        if (confirm('Rit verwijderen?')) {
          startTransition(() => ritVerwijderen(id))
        }
      }}
      disabled={isPending}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
    >
      {isPending ? '...' : 'Verwijderen'}
    </button>
  )
}
