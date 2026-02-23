'use client'

import { useTransition, useState } from 'react'
import { factuurStatusUpdaten, factuurVerwijderen } from '../actions'
import { factuurEmailVersturen } from './emailActions'

type Props = { factuurId: string; status: string; clientEmail?: string | null }

export function FactuurActies({ factuurId, status, clientEmail }: Props) {
  const [isPending, startTransition] = useTransition()
  const [emailStatus, setEmailStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function verstuurEmail() {
    setEmailStatus('idle')
    startTransition(async () => {
      try {
        await factuurEmailVersturen(factuurId)
        setEmailStatus('ok')
      } catch (e) {
        setEmailStatus('error')
        setErrorMsg(e instanceof Error ? e.message : 'Onbekende fout')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {/* E-mail versturen */}
        {clientEmail && status !== 'paid' && (
          <button
            onClick={verstuurEmail}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Versturen...' : '✉ Verstuur per e-mail'}
          </button>
        )}

        {status === 'draft' && (
          <button
            onClick={() => startTransition(() => factuurStatusUpdaten(factuurId, 'sent'))}
            disabled={isPending}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Markeer verzonden
          </button>
        )}
        {status === 'sent' && (
          <button
            onClick={() => startTransition(() => factuurStatusUpdaten(factuurId, 'paid'))}
            disabled={isPending}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Markeer betaald
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

      {emailStatus === 'ok' && (
        <p className="text-sm text-green-600">✓ Factuur verstuurd naar {clientEmail}</p>
      )}
      {emailStatus === 'error' && (
        <p className="text-sm text-red-500">✗ {errorMsg}</p>
      )}
    </div>
  )
}
