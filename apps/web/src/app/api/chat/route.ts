import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { invoices, receipts, trips, users } from '@fiscio/db'
import { eq, and, gte, desc } from 'drizzle-orm'
import { metAILog } from '@/lib/aiLogger'

// ─── Types ──────────────────────────────────────────────────────────────────
export type ChatMessage = { role: 'user' | 'assistant'; content: string }

type Engine = 'perplexity' | 'openai'

// ─── Routing: detecteer welke engine het beste past ──────────────────────────
const PERPLEXITY_KEYWORDS = [
  'verandert', 'verandering', 'nieuw', 'nieuws', '2025', '2026',
  'wetgeving', 'besluit', 'maatregel', 'beleid', 'kabinet',
  'belastingdienst', 'belastingplan', 'prinsjesdag',
  'tarief', 'percentage', 'drempel', 'grens',
  'deadline', 'wanneer', 'datum', 'termijn',
]

const PERSOONLIJK_KEYWORDS = [
  'mijn ', 'ik ', 'ik heb', 'ik verdien', 'ik betaal', 'ik moet',
  'hoeveel moet ik', 'hoeveel kan ik', 'mijn factuur', 'mijn ritten',
  'mijn bonnet', 'apart zetten', 'reserveren', 'sparen',
]

function detecteerEngine(vraag: string): Engine {
  const lower = vraag.toLowerCase()
  const isPersoonlijk = PERSOONLIJK_KEYWORDS.some(k => lower.includes(k))
  const isWetgeving  = PERPLEXITY_KEYWORDS.some(k => lower.includes(k))

  // Persoonlijke vragen altijd met OpenAI (heeft context van gebruiker)
  if (isPersoonlijk) return 'openai'
  // Wetgeving/actueel zonder persoonlijk → Perplexity
  if (isWetgeving) return 'perplexity'
  // Default: OpenAI (heeft gebruikerscontext)
  return 'openai'
}

// ─── Gebruikerscontext ophalen voor OpenAI ────────────────────────────────
async function getUserContext(userId: string): Promise<string> {
  const nu = new Date()
  const beginJaar = new Date(nu.getFullYear(), 0, 1)

  const [factuurData, bonData, ritData, gebruikerData] = await Promise.all([
    db.select({ total: invoices.total, status: invoices.status, createdAt: invoices.createdAt })
      .from(invoices).where(and(eq(invoices.userId, userId), gte(invoices.createdAt, beginJaar)))
      .orderBy(desc(invoices.createdAt)).limit(50),
    db.select({ amount: receipts.amount, vatAmount: receipts.vatAmount, category: receipts.category })
      .from(receipts).where(and(eq(receipts.userId, userId), gte(receipts.receiptDate, beginJaar)))
      .limit(100),
    db.select({ distanceKm: trips.distanceKm, isBusinessTrip: trips.isBusinessTrip })
      .from(trips).where(and(eq(trips.userId, userId), gte(trips.startedAt, beginJaar)))
      .limit(200),
    db.select().from(users).where(eq(users.id, userId)).limit(1),
  ])

  const omzet = factuurData
    .filter(f => f.status !== 'draft')
    .reduce((s, f) => s + parseFloat(f.total ?? '0'), 0)

  const kosten = bonData
    .reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)

  const btw = bonData
    .reduce((s, b) => s + parseFloat(b.vatAmount ?? '0'), 0)

  const kmZakelijk = ritData
    .filter(r => r.isBusinessTrip)
    .reduce((s, r) => s + parseFloat(r.distanceKm ?? '0'), 0)

  const kostenPerCat = bonData.reduce<Record<string, number>>((acc, b) => {
    const cat = b.category ?? 'overig'
    acc[cat] = (acc[cat] ?? 0) + parseFloat(b.amount ?? '0')
    return acc
  }, {})

  const gebruiker = gebruikerData[0]
  const winst = Math.max(0, omzet - kosten)
  const jaarruimte = Math.max(0, Math.round((winst - 13646) * 0.30))
  const kmVergoeding = Math.round(kmZakelijk * 0.23)

  return `
## Fiscio gebruikersdata (${nu.getFullYear()}, t/m vandaag)
**Bedrijf:** ${gebruiker?.companyName ?? 'Onbekend'}

### Financieel overzicht
- Omzet (excl. BTW): €${Math.round(omzet).toLocaleString('nl-NL')}
- Zakelijke kosten: €${Math.round(kosten).toLocaleString('nl-NL')}
- Voorbelasting (BTW op kosten): €${Math.round(btw).toLocaleString('nl-NL')}
- Geschatte winst: €${Math.round(winst).toLocaleString('nl-NL')}

### Kosten per categorie
${Object.entries(kostenPerCat).map(([k, v]) => `- ${k}: €${Math.round(v).toLocaleString('nl-NL')}`).join('\n')}

### Zakelijke ritten
- Totaal zakelijk: ${Math.round(kmZakelijk).toLocaleString('nl-NL')} km
- Km-vergoeding (€0,23/km): €${kmVergoeding.toLocaleString('nl-NL')}

### Belastingpositie (schatting)
- Zelfstandigenaftrek (mits ≥1.225 uur): €3.750
- MKB-winstvrijstelling (12,7%): €${Math.round(winst * 0.127).toLocaleString('nl-NL')}
- Lijfrente jaarruimte: €${jaarruimte.toLocaleString('nl-NL')}
- KOR van toepassing: ${omzet < 20000 ? 'Mogelijk (omzet onder €20K)' : 'Nee (omzet boven €20K)'}
`.trim()
}

// ─── OpenAI aanroep (persoonlijk advies) ─────────────────────────────────
async function* streamOpenAI(messages: ChatMessage[], context: string, apiKey: string) {
  const systeemPrompt = `Je bent een slimme, directe Nederlandse belastingadviseur voor ZZP'ers. Je naam is Fiscio AI.

Je geeft concrete, persoonlijke adviezen op basis van de financiële data van de gebruiker.
Je benoemt grijze gebieden eerlijk met een risico-inschatting (laag/middel/hoog).
Je bent geen corporate robot — je bent de slimme vriend die toevallig belastingexpert is.

Regels:
- Antwoord altijd in het Nederlands
- Gebruik altijd echte bedragen uit de gebruikersdata als die relevant zijn
- Bij bedragen: altijd €-teken en Nederlandse notatie (punt als scheidingsteken)
- Voeg altijd een korte disclaimer toe als je over grijze gebieden praat
- Maximaal 300 woorden tenzij de vraag complexer is

${context}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      stream: true,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systeemPrompt },
        ...messages,
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenAI fout: ${res.status}`)
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const token = json.choices?.[0]?.delta?.content
        if (token) yield token
      } catch { /* skip */ }
    }
  }
}

// ─── Perplexity aanroep (actuele wetgeving) ──────────────────────────────
async function* streamPerplexity(messages: ChatMessage[], apiKey: string) {
  const systeemPrompt = `Je bent een Nederlandse belastingexpert gespecialiseerd in ZZP-belastingrecht.
Je geeft actuele, correcte informatie over Nederlandse belastingregels voor freelancers/ZZP'ers.
Antwoord altijd in het Nederlands. Wees concreet met bedragen en percentages.
Vermeld altijd het jaar waarop de informatie van toepassing is.
Voeg een korte disclaimer toe dat de gebruiker een belastingadviseur kan raadplegen voor persoonlijk advies.`

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'sonar-pro',
      stream: true,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systeemPrompt },
        ...messages,
      ],
    }),
  })

  if (!res.ok) throw new Error(`Perplexity fout: ${res.status}`)
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const token = json.choices?.[0]?.delta?.content
        if (token) yield token
        // Perplexity: bronnen zitten in citations
        const citations = json.citations
        if (citations?.length) {
          yield `\n\n**Bronnen:** ${(citations as string[]).slice(0, 3).map((c: string, i: number) => `[${i + 1}](${c})`).join(' · ')}`
        }
      } catch { /* skip */ }
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Geen token' }, { status: 401 })

  const { message, history = [] }: { message: string; history: ChatMessage[] } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Geen bericht' }, { status: 400 })

  // Auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Onbevoegd' }, { status: 401 })

  const engine = detecteerEngine(message)
  const openaiKey = process.env.OPENAI_API_KEY!
  const perplexityKey = process.env.PERPLEXITY_API_KEY!

  const messages: ChatMessage[] = [...history, { role: 'user', content: message }]

  // Streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Stuur engine-info als eerste chunk
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ engine })}\n\n`))

      try {
        const generator = engine === 'perplexity' && perplexityKey
          ? streamPerplexity(messages, perplexityKey)
          : streamOpenAI(messages, await getUserContext(user.id), openaiKey)

        await metAILog(
          { userId: user.id, provider: engine === 'perplexity' ? 'openai' : 'openai', callType: 'chat', dataCategories: ['chat_vraag'], anonymized: true },
          async () => {
            for await (const token of generator) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            }
            return true
          }
        )
      } catch (e) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`))
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
