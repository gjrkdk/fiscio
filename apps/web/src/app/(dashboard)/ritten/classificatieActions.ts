'use server'

import { eq, and, isNull, or } from 'drizzle-orm'
import { trips } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { anonimiseerRit } from '@/lib/anonymize'
import { metAILog } from '@/lib/aiLogger'

type ClassificatieResultaat = {
  isZakelijk: boolean
  confidence: number
  reden: string
}

async function vraagGPTOmClassificatie(
  rit: { description: string; startAddress: string; endAddress: string; startedAt: Date },
  userId: string
): Promise<ClassificatieResultaat | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const dagVanWeek = new Date(rit.startedAt).toLocaleDateString('nl-NL', { weekday: 'long' })
  const tijdstip = new Date(rit.startedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })

  // 🔒 Anonimiseer locaties en omschrijving vóór verzending
  const anon = anonimiseerRit({
    omschrijving: rit.description,
    vertrekpunt: rit.startAddress,
    bestemming: rit.endAddress,
    dagVanDeWeek: dagVanWeek,
    tijdstip,
  })

  return metAILog(
    { userId, provider: 'openai', callType: 'classificatie', dataCategories: ['rit_locatie', 'rit_omschrijving'], anonymized: true },
    async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 150,
          messages: [
            {
              role: 'system',
              content: `Je bent een Nederlandse belastingadviseur die bepaalt of zakelijke ritten aftrekbaar zijn voor een ZZP'er.
Geef ALLEEN een JSON-object terug zonder uitleg of markdown:
{"classificatie":"zakelijk","confidence":0.92,"reden":"Korte Nederlandse reden max 80 tekens"}
classificatie is "zakelijk" of "prive". confidence is 0.0-1.0.`,
            },
            {
              role: 'user',
              content: `Rit van een ZZP'er:
- Omschrijving: ${anon.omschrijving}
- Van: ${anon.vertrekpunt}
- Naar: ${anon.bestemming}
- Dag: ${anon.dagVanDeWeek}
- Tijdstip: ${anon.tijdstip}

Zakelijk of privé?`,
            },
          ],
        }),
      })

      if (!response.ok) throw new Error(`OpenAI ${response.status}`)
      const json = await response.json()
      const raw = json.choices?.[0]?.message?.content ?? ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Geen JSON in response')

      const parsed = JSON.parse(match[0])
      return {
        isZakelijk: parsed.classificatie === 'zakelijk',
        confidence: Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5)),
        reden: parsed.reden ?? '',
      }
    }
  ).catch(() => null)
}

export async function classificeerRit(ritId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [rit] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, ritId), eq(trips.userId, user.id)))
    .limit(1)

  if (!rit) throw new Error('Rit niet gevonden')

  const resultaat = await vraagGPTOmClassificatie(rit, user.id)
  if (!resultaat) throw new Error('Classificatie mislukt — geen AI-sleutel')

  await db
    .update(trips)
    .set({
      isBusinessTrip: resultaat.isZakelijk,
      classifiedByAi: true,
      aiReason: resultaat.reden,
      aiConfidence: resultaat.confidence.toFixed(2),
    })
    .where(eq(trips.id, ritId))

  revalidatePath('/ritten')
  return resultaat
}

export async function classificeerAlleRitten() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Haal ritten op die nog niet door AI zijn beoordeeld
  const onbeoordeeld = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.userId, user.id),
        or(eq(trips.classifiedByAi, false), isNull(trips.classifiedByAi))
      )
    )

  let gedaan = 0
  for (const rit of onbeoordeeld) {
    const resultaat = await vraagGPTOmClassificatie(rit, user.id)
    if (!resultaat) continue
    await db
      .update(trips)
      .set({
        isBusinessTrip: resultaat.isZakelijk,
        classifiedByAi: true,
        aiReason: resultaat.reden,
        aiConfidence: resultaat.confidence.toFixed(2),
      })
      .where(eq(trips.id, rit.id))
    gedaan++
  }

  revalidatePath('/ritten')
  return { gedaan, totaal: onbeoordeeld.length }
}

export async function overschrijfClassificatie(ritId: string, isZakelijk: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await db
    .update(trips)
    .set({
      isBusinessTrip: isZakelijk,
      classifiedByAi: false, // handmatig overschreven
      aiReason: null,
      aiConfidence: null,
    })
    .where(and(eq(trips.id, ritId), eq(trips.userId, user.id)))

  revalidatePath('/ritten')
}
