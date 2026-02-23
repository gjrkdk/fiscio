'use client'

import { useTransition } from 'react'
import { factuurStatusUpdaten, factuurVerwijderen } from '../actions'

type Props = { factuurId: string; status: string }

export function FactuurActies({ factuurId, status }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      {status === 'draft' && (
        <button
          onClick={() => startTransition(() => factuurStatusUpdaten(factuurId, 'sent'))}
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Markeer als verzonden
        </button>
      )}
      {status === 'sent' && (
        <button
          onClick={() => startTransition(() => factuurStatusUpdaten(factuurId, 'paid'))}
          disabled={isPending}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Markeer als betaald
        </button>
      )}
      <button
        onClick={() => {
          if (!confirm('Factuur verwijderen? Dit kan niet ongedaan worden gemaakt.')) return
          startTransition(() => factuurVerwijderen(factuurId))
        }}
        disabled={isPending}
        className="px-4 py-2 border border-gray-300 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        Verwijderen
      </button>
    </div>
  )
}
