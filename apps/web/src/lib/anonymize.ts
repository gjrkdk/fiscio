/**
 * Anonimisatielaag voor externe AI-calls (AVG/GDPR)
 *
 * Persoonsgegevens worden vervangen door tokens vóór verzending naar OpenAI/Anthropic.
 * Tokens zijn sessiescoped: binnen één aanroep is hetzelfde token consistent,
 * maar over sessies heen zijn tokens niet herleidbaar.
 */

export type AnonContext = {
  tokens: Map<string, string>
  counter: Map<string, number>
}

export function maakAnonContext(): AnonContext {
  return { tokens: new Map(), counter: new Map() }
}

function getToken(ctx: AnonContext, categorie: string, waarde: string): string {
  const sleutel = `${categorie}:${waarde}`
  if (ctx.tokens.has(sleutel)) return ctx.tokens.get(sleutel)!
  const n = (ctx.counter.get(categorie) ?? 0) + 1
  ctx.counter.set(categorie, n)
  const token = `[${categorie.toUpperCase()}-${n}]`
  ctx.tokens.set(sleutel, token)
  return token
}

// Patronen voor Nederlandse persoonsgegevens
const PATRONEN = [
  // IBAN (NL + internationaal)
  { regex: /\b(NL|BE|DE|FR)\d{2}[A-Z0-9]{4,}\b/gi, cat: 'IBAN' },
  // BSN (9 cijfers, vaak als 000.000.000)
  { regex: /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}\b/g, cat: 'BSN' },
  // Telefoonnummer (NL formaten)
  { regex: /\b(\+31|0031|0)[- ]?(\d{2})[- ]?(\d{3}[- ]?\d{4}|\d{4}[- ]?\d{3})\b/g, cat: 'TEL' },
  // E-mailadres
  { regex: /\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/gi, cat: 'EMAIL' },
  // KVK-nummer (8 cijfers)
  { regex: /\b(KVK[:\s#]*)(\d{8})\b/gi, cat: 'KVK' },
  // BTW-nummer (NLxxxxxxxxBxx)
  { regex: /\bNL\d{9}B\d{2}\b/gi, cat: 'BTW' },
  // Postcode
  { regex: /\b\d{4}\s?[A-Z]{2}\b/g, cat: 'POSTCODE' },
]

/**
 * Anonimiseer vrije tekst door patronen te vervangen met tokens.
 */
export function anonimiseerTekst(tekst: string, ctx?: AnonContext): string {
  const context = ctx ?? maakAnonContext()
  let resultaat = tekst
  for (const { regex, cat } of PATRONEN) {
    resultaat = resultaat.replace(regex, (match) => getToken(context, cat, match))
  }
  return resultaat
}

/**
 * Anonimiseer een object recursief (strings worden geanonimiseerd).
 */
export function anonimiseerObject<T>(obj: T, ctx?: AnonContext): T {
  const context = ctx ?? maakAnonContext()
  if (typeof obj === 'string') return anonimiseerTekst(obj, context) as T
  if (Array.isArray(obj)) return obj.map((item) => anonimiseerObject(item, context)) as T
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, anonimiseerObject(v, context)])
    ) as T
  }
  return obj
}

/**
 * Specifiek voor rit-classificatie: anonimiseer locaties maar bewaar structuur.
 */
export function anonimiseerRit(data: {
  omschrijving: string
  vertrekpunt: string
  bestemming: string
  dagVanDeWeek: string
  tijdstip: string
}) {
  const ctx = maakAnonContext()
  return {
    omschrijving: anonimiseerTekst(data.omschrijving, ctx),
    // Bewaar stad/regio, strip straatnaam + huisnummer
    vertrekpunt: stripStraat(anonimiseerTekst(data.vertrekpunt, ctx)),
    bestemming: stripStraat(anonimiseerTekst(data.bestemming, ctx)),
    dagVanDeWeek: data.dagVanDeWeek,
    tijdstip: data.tijdstip,
  }
}

/**
 * Strip straatnaam en huisnummer, bewaar alleen stad/regio.
 * "Hoofdstraat 12, Amsterdam" → "Amsterdam"
 */
function stripStraat(adres: string): string {
  // Probeer stad te extraheren na komma
  const deelna = adres.split(',')
  if (deelna.length >= 2) {
    return deelna[deelna.length - 1]!.trim()
  }
  // Verwijder huisnummer aan het begin
  return adres.replace(/^[\w\s]+\d+[a-z]?,?\s*/i, '').trim() || adres
}
