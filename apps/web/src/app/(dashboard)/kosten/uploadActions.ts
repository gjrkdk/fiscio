'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type OcrResultaat = {
  vendor?: string
  amount?: string
  vatRate?: string
  receiptDate?: string
  category?: string
  description?: string
}

export type FotoVerwerkResult = {
  imageUrl: string
  ocr: OcrResultaat | null
  ocrRaw: string | null
}

export async function bonFotoVerwerken(formData: FormData): Promise<FotoVerwerkResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('foto') as File | null
  if (!file || file.size === 0) throw new Error('Geen bestand geselecteerd')

  // Unieke bestandsnaam: userId/timestamp-origineel.ext
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeName = `${user.id}/${Date.now()}.${ext}`

  // Upload naar Supabase Storage
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(safeName, bytes, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(`Upload mislukt: ${uploadError.message}`)

  // Signed URL (geldig 1 uur, voor OCR API call)
  const { data: signedData } = await supabase.storage
    .from('receipts')
    .createSignedUrl(safeName, 3600)

  const imageUrl = safeName // We slaan het pad op, niet de signed URL

  // OCR via OpenAI Vision (optioneel — alleen als key beschikbaar)
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey || !signedData?.signedUrl) {
    return { imageUrl, ocr: null, ocrRaw: null }
  }

  try {
    // Afbeelding downloaden en naar base64 omzetten (signed URL niet bereikbaar voor OpenAI)
    const imgRes = await fetch(signedData.signedUrl)
    if (!imgRes.ok) return { imageUrl, ocr: null, ocrRaw: null }
    const imgBuffer = await imgRes.arrayBuffer()
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const base64 = Buffer.from(imgBuffer).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyseer dit bonnetje en geef ALLEEN een JSON-object terug zonder uitleg of markdown.
Formaat:
{
  "vendor": "naam van de leverancier/winkel",
  "amount": "bedrag excl. BTW als getal (bijv. 8.26)",
  "vatRate": "BTW tarief als getal: 0, 9 of 21",
  "receiptDate": "datum in YYYY-MM-DD formaat",
  "category": "een van: kantoor, reizen, software, maaltijden, abonnement, overig",
  "description": "korte omschrijving van de aankoop"
}
Als een veld niet leesbaar is, laat het dan weg uit de JSON.`,
            },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          ],
        }],
      }),
    })

    if (!response.ok) return { imageUrl, ocr: null, ocrRaw: null }

    const json = await response.json()
    const raw = json.choices?.[0]?.message?.content ?? ''

    // JSON parsen
    const match = raw.match(/\{[\s\S]*\}/)
    const ocr: OcrResultaat = match ? JSON.parse(match[0]) : {}

    return { imageUrl, ocr, ocrRaw: raw }
  } catch {
    return { imageUrl, ocr: null, ocrRaw: null }
  }
}

export async function bonFotoVerwijderen(pad: string) {
  const supabase = await createClient()
  await supabase.storage.from('receipts').remove([pad])
}

export async function bonFotoSignedUrl(pad: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('receipts').createSignedUrl(pad, 3600)
  return data?.signedUrl ?? null
}
