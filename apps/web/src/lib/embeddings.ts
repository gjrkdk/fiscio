import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

// ─── Embedding genereren via OpenAI text-embedding-3-small ───────────────
export async function genereerEmbedding(tekst: string): Promise<number[]> {
  const schoon = tekst.replace(/\s+/g, ' ').trim().slice(0, 8000)
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: schoon,
    }),
  })
  if (!res.ok) throw new Error(`Embedding fout: ${res.status}`)
  const json = await res.json()
  return json.data[0].embedding as number[]
}

// ─── Tekst-representaties voor embedding ──────────────────────────────────
export function ritNaarTekst(rit: {
  description: string
  startAddress: string
  endAddress: string
  notes?: string | null
  isBusinessTrip: boolean
  distanceKm: string
}): string {
  return [
    `Rit: ${rit.description}`,
    `Van ${rit.startAddress} naar ${rit.endAddress}`,
    `${rit.distanceKm} km`,
    rit.isBusinessTrip ? 'Zakelijk' : 'Privé',
    rit.notes ?? '',
  ].filter(Boolean).join('. ')
}

export function bonNaarTekst(bon: {
  vendor?: string | null
  category?: string | null
  description?: string | null
  amount?: string | null
}): string {
  return [
    bon.vendor ? `Leverancier: ${bon.vendor}` : '',
    bon.category ? `Categorie: ${bon.category}` : '',
    bon.description ? `Omschrijving: ${bon.description}` : '',
    bon.amount ? `Bedrag: €${bon.amount}` : '',
  ].filter(Boolean).join('. ')
}

export function factuurNaarTekst(factuur: {
  clientName: string
  invoiceNumber: string
  total: string
  notes?: string | null
  lineItems?: Array<{ description: string }> | null
}): string {
  const regels = factuur.lineItems?.map(r => r.description).join(', ') ?? ''
  return [
    `Factuur ${factuur.invoiceNumber} aan ${factuur.clientName}`,
    `Totaal: €${factuur.total}`,
    regels ? `Werkzaamheden: ${regels}` : '',
    factuur.notes ?? '',
  ].filter(Boolean).join('. ')
}

// ─── Semantisch zoeken: meest relevante data bij een vraag ────────────────
export async function semantischZoeken(
  userId: string,
  vraag: string,
  limiet = 5
): Promise<{ type: string; tekst: string; datum?: string }[]> {
  const embedding = await genereerEmbedding(vraag)
  const vectorStr = `[${embedding.join(',')}]`

  const [ritten, bonnen, facturen] = await Promise.all([
    // Semantisch zoeken in ritten
    db.execute(sql`
      SELECT
        'rit' as type,
        description || ' — ' || start_address || ' naar ' || end_address || ' (' || distance_km || ' km)' as tekst,
        started_at::text as datum,
        embedding <=> ${vectorStr}::vector AS afstand
      FROM trips
      WHERE user_id = ${userId} AND embedding IS NOT NULL
      ORDER BY afstand ASC
      LIMIT ${limiet}
    `),
    // Semantisch zoeken in bonnetjes
    db.execute(sql`
      SELECT
        'bon' as type,
        COALESCE(vendor, '') || ' — ' || COALESCE(category, '') || ' — €' || COALESCE(amount::text, '?') as tekst,
        receipt_date::text as datum,
        embedding <=> ${vectorStr}::vector AS afstand
      FROM receipts
      WHERE user_id = ${userId} AND embedding IS NOT NULL
      ORDER BY afstand ASC
      LIMIT ${limiet}
    `),
    // Semantisch zoeken in facturen
    db.execute(sql`
      SELECT
        'factuur' as type,
        invoice_number || ' aan ' || client_name || ' — €' || total as tekst,
        created_at::text as datum,
        embedding <=> ${vectorStr}::vector AS afstand
      FROM invoices
      WHERE user_id = ${userId} AND embedding IS NOT NULL
      ORDER BY afstand ASC
      LIMIT ${limiet}
    `),
  ])

  // Combineer en sorteer op relevantie (laagste afstand = meest relevant)
  type ZoekRij = { type: unknown; tekst: unknown; datum: unknown; afstand: unknown }
  const alles = [
    ...(Array.from(ritten) as ZoekRij[]).map(r => ({ type: String(r.type), tekst: String(r.tekst), datum: String(r.datum ?? ''), afstand: Number(r.afstand) })),
    ...(Array.from(bonnen) as ZoekRij[]).map(r => ({ type: String(r.type), tekst: String(r.tekst), datum: String(r.datum ?? ''), afstand: Number(r.afstand) })),
    ...(Array.from(facturen) as ZoekRij[]).map(r => ({ type: String(r.type), tekst: String(r.tekst), datum: String(r.datum ?? ''), afstand: Number(r.afstand) })),
  ]

  return alles
    .sort((a, b) => a.afstand - b.afstand)
    .slice(0, limiet)
    .map(({ type, tekst, datum }) => ({ type, tekst, datum }))
}
