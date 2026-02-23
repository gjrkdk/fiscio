import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Valideer Bearer token
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Geen token', ocr: null }, { status: 401 })

  // Haal het opslagpad op uit de request body
  const body = await req.json().catch(() => ({}))
  const { pad } = body
  if (!pad) return NextResponse.json({ error: 'Geen pad', ocr: null }, { status: 400 })

  // Verifieer token via Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) {
    console.error('[OCR] Auth error:', authError)
    return NextResponse.json({ error: 'Onbevoegd', ocr: null }, { status: 401 })
  }

  // Controleer dat het pad bij deze gebruiker hoort
  if (!pad.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Geen toegang tot dit bestand', ocr: null }, { status: 403 })
  }

  // Signed URL ophalen
  const { data: signedData, error: storageError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(pad, 3600)

  if (!signedData?.signedUrl) {
    console.error('[OCR] Storage error:', storageError)
    return NextResponse.json({ error: 'Bestand niet gevonden in storage', ocr: null }, { status: 404 })
  }

  // OCR via OpenAI Vision
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[OCR] OPENAI_API_KEY niet ingesteld')
    return NextResponse.json({ error: 'OCR niet geconfigureerd', ocr: null })
  }

  try {
    // Afbeelding downloaden en naar base64 omzetten (signed URL is niet bereikbaar voor OpenAI)
    const imgRes = await fetch(signedData.signedUrl)
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Afbeelding downloaden mislukt: ${imgRes.status}`, ocr: null })
    }
    const imgBuffer = await imgRes.arrayBuffer()
    // Strip parameters (bijv. "; charset=utf-8") — OpenAI accepteert alleen clean MIME type
    const rawType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const contentType = rawType.split(';')[0]!.trim()
    const mimeType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(contentType)
      ? contentType
      : 'image/jpeg'
    const base64 = Buffer.from(imgBuffer).toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyseer dit bonnetje en geef ALLEEN een JSON-object terug:
{"vendor":"naam leverancier","amount":"bedrag excl BTW als getal","vatRate":"0, 9 of 21","receiptDate":"YYYY-MM-DD","category":"kantoor|reizen|software|maaltijden|abonnement|overig","description":"korte omschrijving"}
Laat velden weg als ze niet leesbaar zijn.`,
            },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[OCR] OpenAI error:', response.status, errText)
      return NextResponse.json({ error: `OpenAI fout: ${response.status}`, ocr: null })
    }

    const json = await response.json()
    const raw = json.choices?.[0]?.message?.content ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    const ocr = match ? JSON.parse(match[0]) : null
    return NextResponse.json({ ocr })
  } catch (e) {
    console.error('[OCR] Exception:', e)
    return NextResponse.json({ error: String(e), ocr: null })
  }
}
