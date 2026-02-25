'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Message = {
  role: 'user' | 'assistant'
  content: string
  engine?: 'perplexity' | 'openai'
  laden?: boolean
}

// ─── Paginacontext: suggesties + uitleg per route ─────────────────────────
const PAGINA_CONFIG: Record<string, { label: string; suggesties: string[] }> = {
  '/dashboard': {
    label: 'Dashboard',
    suggesties: [
      'Hoeveel heb ik dit jaar verdient?',
      'Hoeveel belasting moet ik nog betalen?',
      'Wat zijn mijn grootste kostenposten?',
    ],
  },
  '/ritten': {
    label: 'Ritten',
    suggesties: [
      'Hoeveel zakelijke km heb ik dit jaar gereden?',
      'Wat levert mijn km-vergoeding op dit jaar?',
      'Zijn er ritten die ik nog moet classificeren?',
    ],
  },
  '/kosten': {
    label: 'Kosten & Bonnetjes',
    suggesties: [
      'Welke kosten kan ik aftrekken van de belasting?',
      'Wat heb ik dit jaar uitgegeven aan software?',
      'Heb ik zakelijke kosten gemist?',
    ],
  },
  '/facturen': {
    label: 'Facturen',
    suggesties: [
      'Welke facturen staan nog open?',
      'Wat is mijn gemiddelde betaaltermijn?',
      'Hoeveel omzet heb ik dit kwartaal gemaakt?',
    ],
  },
  '/klanten': {
    label: 'Klanten',
    suggesties: [
      'Welke klant heeft het meest bijgedragen aan mijn omzet?',
      'Hoe ziet mijn klantportfolio eruit?',
    ],
  },
  '/btw': {
    label: 'BTW-aangifte',
    suggesties: [
      'Hoeveel BTW moet ik dit kwartaal afdragen?',
      'Wat is het verschil tussen verschuldigde en voorbelasting?',
      'Wanneer is de deadline voor mijn BTW-aangifte?',
    ],
  },
  '/belastingtips': {
    label: 'Belastingtips',
    suggesties: [
      'Welke aftrekposten zijn voor mij het meest interessant?',
      'Kom ik in aanmerking voor de zelfstandigenaftrek?',
      'Wat kan ik doen om minder belasting te betalen?',
    ],
  },
  '/rapportages': {
    label: 'Rapportages',
    suggesties: [
      'Hoe verhoudt mijn omzet zich tot vorig kwartaal?',
      'In welke maand verdiende ik het meest?',
      'Wat zijn mijn meest winstgevende maanden?',
    ],
  },
}

function getPaginaConfig(pathname: string) {
  const match = Object.keys(PAGINA_CONFIG).find(k => pathname.startsWith(k))
  return PAGINA_CONFIG[match ?? '/dashboard'] ?? {
    label: 'Fiscio',
    suggesties: [
      'Hoeveel heb ik dit jaar verdiend?',
      'Hoeveel belasting moet ik betalen?',
      'Wat zijn mijn grootste kosten?',
    ],
  }
}

function EngineTag({ engine }: { engine: 'perplexity' | 'openai' }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
      engine === 'perplexity' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
    }`}>
      {engine === 'perplexity' ? '🔍' : '🧠'}
    </span>
  )
}

export function AIWidget() {
  const [open, setOpen]         = useState(false)
  const [berichten, setBerichten] = useState<Message[]>([])
  const [invoer, setInvoer]     = useState('')
  const [bezig, setBezig]       = useState(false)
  const onderRef  = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const pathname  = usePathname()
  const pagina    = getPaginaConfig(pathname)

  useEffect(() => {
    onderRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [berichten])

  useEffect(() => {
    if (open && berichten.length === 0) {
      inputRef.current?.focus()
    }
  }, [open, berichten.length])

  async function stuurBericht(tekst?: string) {
    const vraag = (tekst ?? invoer).trim()
    if (!vraag || bezig) return

    setInvoer('')
    setBezig(true)

    const userMsg: Message  = { role: 'user', content: vraag }
    const loadMsg: Message  = { role: 'assistant', content: '', laden: true }
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: vraag,
          history,
          pageContext: pagina.label,
        }),
      })

      if (!res.body) throw new Error('Geen response')
      const reader  = res.body.getReader()
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
              antwoord = `⚠️ ${json.error}`
              setBerichten(prev => {
                const nieuw = [...prev]
                nieuw[nieuw.length - 1] = { role: 'assistant', content: antwoord, laden: false }
                return nieuw
              })
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setBerichten(prev => {
        const nieuw = [...prev]
        nieuw[nieuw.length - 1] = { role: 'assistant', content: '⚠️ Er ging iets mis. Probeer opnieuw.', laden: false }
        return nieuw
      })
    } finally {
      setBezig(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function wis() {
    setBerichten([])
    setInvoer('')
  }

  return (
    <>
      {/* Floating knop */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all ${
          open ? 'bg-gray-700 rotate-90' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        title="Fiscio AI"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)' }}>

          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">🤖 Fiscio AI</p>
              <p className="text-blue-200 text-xs">📍 {pagina.label}</p>
            </div>
            <button onClick={wis} className="text-blue-200 hover:text-white text-xs transition" title="Gesprek wissen">
              🗑️ Wis
            </button>
          </div>

          {/* Berichten */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{ minHeight: 200, maxHeight: 380 }}>
            {berichten.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 text-center">Stel een vraag over jouw financiën</p>
                {pagina.suggesties.map(s => (
                  <button
                    key={s}
                    onClick={() => stuurBericht(s)}
                    className="w-full text-left text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition leading-relaxed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              berichten.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                  }`}>
                    {msg.laden ? (
                      <span className="flex gap-1 items-center h-4">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
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
                    {!msg.laden && msg.engine && msg.role === 'assistant' && (
                      <div className="mt-1.5">
                        <EngineTag engine={msg.engine} />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={onderRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={invoer}
                onChange={e => setInvoer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stuurBericht() } }}
                placeholder="Stel een vraag..."
                rows={1}
                disabled={bezig}
                className="flex-1 text-xs resize-none border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ maxHeight: 80 }}
              />
              <button
                onClick={() => stuurBericht()}
                disabled={!invoer.trim() || bezig}
                className="bg-blue-600 text-white rounded-xl px-3 py-2 text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition shrink-0"
              >
                {bezig ? '...' : '→'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
