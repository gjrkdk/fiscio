import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { invoices, receipts, trips, users } from '@fiscio/db'
import { eq, and, gte, desc } from 'drizzle-orm'
import { metAILog } from '@/lib/aiLogger'
import { berekenTips } from '@/lib/belastingtips'
import { semantischZoeken } from '@/lib/embeddings'

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
  'minder belasting', 'besparen', 'optimaliseren', 'aftrekken',
  'kom ik in aanmerking', 'wat kan ik', 'wat moet ik',
  'ben ik', 'heb ik', 'voor mij', 'mijn situatie',
]

// Pure wetgevingsvragen zonder persoonlijk component
const PUUR_WETGEVING_KEYWORDS = [
  'wat is het tarief', 'wat is de grens', 'wanneer moet',
  'wat verandert', 'nieuw beleid', 'prinsjesdag', 'belastingplan',
  'hoe werkt de', 'wat is de kia', 'wat is de kor',
  'wat is het urencriterium', 'uitleg ', 'definitie',
]

function detecteerEngine(vraag: string): Engine {
  const lower = vraag.toLowerCase()
  const isPersoonlijk  = PERSOONLIJK_KEYWORDS.some(k => lower.includes(k))
  const isPuurWetgeving = PUUR_WETGEVING_KEYWORDS.some(k => lower.includes(k))
  const isWetgeving    = PERPLEXITY_KEYWORDS.some(k => lower.includes(k))

  // Persoonlijk → altijd OpenAI (heeft context van gebruiker)
  if (isPersoonlijk) return 'openai'
  // Pure wetgevingsvraag met actueel element → Perplexity
  if (isPuurWetgeving && isWetgeving) return 'perplexity'
  // Actuele wetgeving zonder persoonlijk → Perplexity
  if (isWetgeving && !isPersoonlijk) return 'perplexity'
  // Default: OpenAI met gebruikerscontext (persoonlijk advies)
  return 'openai'
}

// ─── Gebruikerscontext ophalen voor OpenAI ────────────────────────────────
async function getUserContext(userId: string): Promise<string> {
  try {
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
  const kmVergoeding = Math.round(kmZakelijk * 0.23)
  const urenGeregistreerd = gebruiker?.urenHuidigJaar ?? 0

  // Draai de tips-engine voor concrete kansen
  const investeerdbedrag = bonData
    .filter(b => ['kantoor', 'software'].includes(b.category ?? ''))
    .reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)

  const tips = berekenTips({ omzetJaar: omzet, kostenJaar: kosten, investeerdbedragJaar: investeerdbedrag, urenGeregistreerd })
  const actieveleTips = tips.tips.filter(t => t.status === 'kans' || t.status === 'aandacht')

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
- Lijfrente jaarruimte: €${tips.tips.find(t => t.id === 'lijfrente')?.impact ? `€${(tips.tips.find(t => t.id === 'lijfrente')!.impact!).toLocaleString('nl-NL')} besparing mogelijk` : 'Niet van toepassing'}
- KOR van toepassing: ${omzet < 20000 ? 'Mogelijk (omzet onder €20K)' : 'Nee (omzet boven €20K)'}
- Uren geregistreerd: ${urenGeregistreerd} / 1.225 uur

### Concrete belastingkansen (uit Fiscio tips-engine)
${actieveleTips.length > 0
  ? actieveleTips.map(t =>
    `- **${t.titel}**: ${t.uitleg.slice(0, 120)}... → Potentiële besparing: ${t.impact ? `€${t.impact.toLocaleString('nl-NL')}` : 'onbekend'}`
  ).join('\n')
  : '- Geen directe kansen gevonden op basis van huidige data'}

### Totaal potentiële besparing
- €${tips.totaalPotentieel.toLocaleString('nl-NL')} (op basis van gedetecteerde kansen)
`.trim()
  } catch (e) {
    console.error('[Chat] getUserContext fout:', e)
    return '## Gebruikersdata tijdelijk niet beschikbaar'
  }
}

// ─── OpenAI aanroep (persoonlijk advies) ─────────────────────────────────
async function* streamOpenAI(messages: ChatMessage[], context: string, apiKey: string) {
  const systeemPrompt = `Je bent Fiscio AI — een scherpe, persoonlijke belastingadviseur voor ZZP'ers.
Je hebt toegang tot de volledige financiële data van de gebruiker (zie hieronder).

KERNREGEL: Gebruik ALTIJD de echte cijfers uit de gebruikersdata in je antwoord.
Nooit generieke adviezen geven als je specifieke data hebt. Geen "afhankelijk van je situatie" — je KENT de situatie.

Aanpak bij elke vraag:
1. Kijk naar de concrete cijfers van de gebruiker
2. Identificeer de grootste kansen/risico's op basis van die cijfers
3. Geef een concreet, gepersonaliseerd antwoord met echte bedragen
4. Benoem grijze gebieden met risico-label: [risico: laag/middel/hoog]
5. Sluit af met de 1-2 meest impactvolle acties

Toon: direct, eerlijk, geen corporate taal. De slimme vriend die toevallig belastingexpert is.
Taal: altijd Nederlands.
Lengte: beknopt maar compleet. Gebruik opsommingen voor meerdere punten.
Disclaimer: alleen toevoegen bij grijze gebieden, niet standaard onderaan elk antwoord.

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

// ─── Perplexity: haal wetgevingsinfo op (niet-streaming, bufferen) ────────
async function haalPerplexityInfo(messages: ChatMessage[], apiKey: string): Promise<{ tekst: string; bronnen: string[] }> {
  const systeemPrompt = `Je bent een Nederlandse belastingexpert gespecialiseerd in ZZP-belastingrecht.
Je geeft actuele, correcte informatie over Nederlandse belastingregels voor freelancers/ZZP'ers.
Antwoord in het Nederlands. Wees concreet met bedragen en percentages.
Vermeld altijd het jaar. Houd het beknopt: max 200 woorden.`

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'sonar-pro',
      stream: false,
      max_tokens: 600,
      messages: [{ role: 'system', content: systeemPrompt }, { role: 'user', content: messages[messages.length - 1]!.content }],
    }),
  })

  if (!res.ok) {
    const errTekst = await res.text()
    console.error('[Perplexity] Fout:', res.status, errTekst)
    throw new Error(`Perplexity fout ${res.status}: ${errTekst.slice(0, 200)}`)
  }
  const json = await res.json()
  const tekst = json.choices?.[0]?.message?.content ?? ''
  const bronnen: string[] = (json.citations ?? []).slice(0, 3)
  return { tekst, bronnen }
}

// ─── Perplexity + GPT-4o impact: gecombineerde streaming ─────────────────
async function* streamPerplexityMetImpact(
  messages: ChatMessage[],
  context: string,
  perplexityKey: string,
  openaiKey: string
) {
  // Fase 1: Perplexity wetgevingsinfo ophalen (met fallback naar OpenAI)
  let wetInfo: string
  let bronnen: string[] = []
  try {
    const result = await haalPerplexityInfo(messages, perplexityKey)
    wetInfo = result.tekst
    bronnen = result.bronnen
  } catch (e) {
    console.error('[Chat] Perplexity fallback naar OpenAI:', e)
    // Fallback: gebruik OpenAI met volledige context
    yield* streamOpenAI(messages, context, openaiKey)
    return
  }

  // Stream de Perplexity info
  yield '**📋 Actuele wetgeving:**\n\n'
  yield wetInfo
  if (bronnen.length > 0) {
    yield `\n\n**Bronnen:** ${bronnen.map((b, i) => `[${i + 1}](${b})`).join(' · ')}`
  }

  // Scheiding
  yield '\n\n---\n\n**💡 Impact voor jou:**\n\n'

  // Fase 2: GPT-4o personaliseert op basis van wetinfo + gebruikersdata
  const impactPrompt = `De gebruiker vroeg: "${messages[messages.length - 1]?.content}"

Hier is de actuele wetgevingsinformatie (van Perplexity):
${wetInfo}

Analyseer nu specifiek de impact op de situatie van deze gebruiker op basis van hun financiële data.
Wees concreet: noem echte bedragen, percentages en wat het betekent voor hun specifieke omzet/winst/kosten.
Geef 2-3 concrete, geprioriteerde acties.
Geen algemene uitleg herhalen — alleen de persoonlijke impact en wat ze nu moeten doen.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      stream: true,
      max_tokens: 500,
      messages: [
        { role: 'system', content: `Je bent Fiscio AI — een persoonlijke belastingadviseur voor ZZP'ers.\nGebruik ALTIJD de echte cijfers uit de data hieronder.\n\n${context}` },
        { role: 'user', content: impactPrompt },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenAI impact fout: ${res.status}`)
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
        const [context, relevanteData] = await Promise.all([
          getUserContext(user.id),
          semantischZoeken(user.id, message).catch(() => []),
        ])

        // Voeg semantisch gevonden data toe aan context
        const contextMetZoekresultaten = relevanteData.length > 0
          ? `${context}\n\n### Meest relevante data bij deze vraag (semantisch gezocht)\n${relevanteData.map(r => `- [${r.type}] ${r.tekst}${r.datum ? ` (${r.datum.slice(0, 10)})` : ''}`).join('\n')}`
          : context

        const generator = engine === 'perplexity' && perplexityKey
          ? streamPerplexityMetImpact(messages, contextMetZoekresultaten, perplexityKey, openaiKey)
          : streamOpenAI(messages, contextMetZoekresultaten, openaiKey)

        await metAILog(
          { userId: user.id, provider: 'openai', callType: 'chat', dataCategories: ['chat_vraag'], anonymized: true },
          async () => {
            for await (const token of generator) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            }
            return true
          }
        )
      } catch (e) {
        console.error('[Chat] Stream fout:', e)
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
