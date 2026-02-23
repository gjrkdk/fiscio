'use client'

import { useTransition, useState } from 'react'
import { classificeerRit, overschrijfClassificatie, classificeerAlleRitten } from './classificatieActions'

type Props = {
  ritId: string
  isZakelijk: boolean
  classifiedByAi: boolean | null
  aiReason: string | null
  aiConfidence: string | null
}

export function RitClassificatieBadge({ ritId, isZakelijk, classifiedByAi, aiReason, aiConfidence }: Props) {
  const [isPending, startTransition] = useTransition()
  const [toonTooltip, setToonTooltip] = useState(false)

  const confidence = aiConfidence ? Math.round(parseFloat(aiConfidence) * 100) : null

  return (
    <div className="flex items-center gap-1.5">
      {/* Zakelijk / Privé badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isZakelijk ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {isZakelijk ? 'Zakelijk' : 'Privé'}
      </span>

      {/* AI indicator */}
      {classifiedByAi && aiReason && (
        <div className="relative">
          <button
            onMouseEnter={() => setToonTooltip(true)}
            onMouseLeave={() => setToonTooltip(false)}
            className="text-xs text-purple-500 hover:text-purple-700 cursor-help"
            title={aiReason}
          >
            ✨{confidence ? ` ${confidence}%` : ''}
          </button>
          {toonTooltip && (
            <div className="absolute bottom-6 left-0 z-10 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
              <p className="font-medium mb-0.5">AI-analyse</p>
              <p className="text-gray-300">{aiReason}</p>
              {confidence && <p className="text-gray-400 mt-1">Zekerheid: {confidence}%</p>}
            </div>
          )}
        </div>
      )}

      {/* Classificeer knop (nog niet door AI) */}
      {!classifiedByAi && (
        <button
          onClick={() => startTransition(async () => { await classificeerRit(ritId) })}
          disabled={isPending}
          className="text-xs text-gray-400 hover:text-purple-600 disabled:opacity-40 transition-colors"
          title="Laat AI bepalen"
        >
          {isPending ? '⏳' : '✨'}
        </button>
      )}
    </div>
  )
}

export function RitOverrideKnoppen({ ritId, isZakelijk }: { ritId: string; isZakelijk: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex gap-1">
      <button
        onClick={() => startTransition(() => overschrijfClassificatie(ritId, true))}
        disabled={isPending || isZakelijk}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${
          isZakelijk
            ? 'bg-blue-600 text-white cursor-default'
            : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700'
        }`}
      >
        Zakelijk
      </button>
      <button
        onClick={() => startTransition(() => overschrijfClassificatie(ritId, false))}
        disabled={isPending || !isZakelijk}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${
          !isZakelijk
            ? 'bg-gray-600 text-white cursor-default'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        Privé
      </button>
    </div>
  )
}

export function ClassificeerAllesKnop({ aantalOnbeoordeeld }: { aantalOnbeoordeeld: number }) {
  const [isPending, startTransition] = useTransition()
  const [resultaat, setResultaat] = useState<{ gedaan: number; totaal: number } | null>(null)

  if (aantalOnbeoordeeld === 0) return null

  return (
    <div className="flex items-center gap-3">
      {resultaat && (
        <span className="text-xs text-green-600">✓ {resultaat.gedaan} ritten geclassificeerd</span>
      )}
      <button
        onClick={() =>
          startTransition(async () => {
            const r = await classificeerAlleRitten()
            setResultaat(r)
          })
        }
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <>
            <span className="animate-spin">⏳</span> Analyseren...
          </>
        ) : (
          <>✨ AI classificeert {aantalOnbeoordeeld} rit{aantalOnbeoordeeld !== 1 ? 'ten' : ''}</>
        )}
      </button>
    </div>
  )
}
