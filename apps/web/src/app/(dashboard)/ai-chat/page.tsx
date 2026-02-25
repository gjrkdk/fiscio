'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  role: 'user' | 'assistant'
  content: string
  engine?: 'perplexity' | 'openai'
  laden?: boolean
}

const SUGGESTIES = [
  'Hoeveel belasting moet ik dit jaar betalen?',
  'Hoeveel moet ik maandelijks reserveren?',
  'Wat verandert er in 2025 voor ZZP\'ers?',
  'Kom ik in aanmerking voor de zelfstandigenaftrek?',
  'Wat kan ik doen om minder belasting te betalen?',
  'Is een BV interessant voor mij?',
]

function EngineLabel({ engine }: { engine: 'perplexity' | 'openai' }) {
  if (!engine) return null
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      engine === 'perplexity'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-blue-700'
    }`}>
      {engine === 'perplexity' ? '🔍 Perplexity — actuele wetgeving' : '🧠 GPT-4o — persoonlijk advies'}
    </span>
  )
}

function Bericht({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
        isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!isUser && msg.engine && <EngineLabel engine={msg.engine} />}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
        }`}>
          {msg.laden ? (
            <span className="flex gap-1 items-center h-5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          ) : (
            <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
              __html: msg.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="underline">$1</a>')
                .replace(/^#{1,3} (.+)/gm, '<strong>$1</strong>')
                .replace(/^- (.+)/gm, '• $1')
            }} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function AIChatPage() {
  const [berichten, setBerichten] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hallo! Ik ben Fiscio AI — jouw persoonlijke belastingadviseur. Ik ken jouw financiële data en kan vragen beantwoorden over jouw specifieke situatie én over actuele belastingregels.\n\nWaar kan ik je mee helpen?',
    engine: 'openai',
  }])
  const [invoer, setInvoer] = useState('')
  const [bezig, setBezig] = useState(false)
  const onderRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    onderRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [berichten])

  async function stuurBericht(tekst?: string) {
    const vraag = (tekst ?? invoer).trim()
    if (!vraag || bezig) return

    setInvoer('')
    setBezig(true)

    const userMsg: Message = { role: 'user', content: vraag }
    const loadMsg: Message = { role: 'assistant', content: '', laden: true }

    setBerichten(prev => [...prev, userMsg, loadMsg])

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Niet ingelogd')

      const history = berichten
        .filter(b => !b.laden)
        .map(b => ({ role: b.role, content: b.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: vraag, history }),
      })

      if (!res.body) throw new Error('Geen response')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let antwoord = ''
      let engine: 'perplexity' | 'openai' = 'openai'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const json = JSON.parse(data)
            if (json.engine) engine = json.engine
            if (json.token) {
              antwoord += json.token
              setBerichten(prev => {
                const nieuw = [...prev]
                nieuw[nieuw.length - 1] = { role: 'assistant', content: antwoord, engine, laden: false }
                return nieuw
              })
            }
            if (json.error) {
              antwoord = `⚠️ Fout: ${json.error}`
              setBerichten(prev => {
                const nieuw = [...prev]
                nieuw[nieuw.length - 1] = { role: 'assistant', content: antwoord, laden: false }
                return nieuw
              })
            }
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setBerichten(prev => {
        const nieuw = [...prev]
        nieuw[nieuw.length - 1] = {
          role: 'assistant',
          content: 'Er ging iets mis. Probeer het opnieuw.',
          laden: false,
        }
        return nieuw
      })
    } finally {
      setBezig(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      stuurBericht()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <h1 className="text-lg font-bold text-gray-900">Fiscio AI — Belastingadviseur</h1>
        <p className="text-xs text-gray-500">
          Persoonlijk advies via GPT-4o · Actuele wetgeving via Perplexity Sonar Pro
        </p>
      </div>

      {/* Berichten */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gray-50">
        {berichten.map((msg, i) => <Bericht key={i} msg={msg} />)}
        <div ref={onderRef} />
      </div>

      {/* Suggesties */}
      {berichten.length <= 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIES.map(s => (
              <button
                key={s}
                onClick={() => stuurBericht(s)}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={invoer}
            onChange={e => setInvoer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stel een vraag over jouw belastingen..."
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ maxHeight: '120px' }}
            disabled={bezig}
          />
          <button
            onClick={() => stuurBericht()}
            disabled={!invoer.trim() || bezig}
            className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition shrink-0"
          >
            {bezig ? '...' : 'Stuur →'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Indicatief advies — geen vervanging voor een officiële belastingadviseur
        </p>
      </div>
    </div>
  )
}
