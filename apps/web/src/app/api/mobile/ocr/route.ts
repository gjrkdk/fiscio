import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { metAILog } from '@/lib/aiLogger'

const PROMPT = `Je bent een expert in het lezen van Nederlandse kassabonnen en facturen.
Analyseer de afbeelding zorgvuldig en geef ALLEEN een geldig JSON-object terug, zonder uitleg of markdown.

Regels:
- "vendor": naam van de winkel of leverancier (exact zoals op het bon staat)
- "amount": het bedrag EXCLUSIEF BTW als decimaal getal (bijv. 8.26). Als alleen incl. BTW staat: deel door 1.21 (21%), 1.09 (9%) of laat ongewijzigd (0%)
- "vatRate": BTW-tarief als getal: 0, 9 of 21. Supermarkt/horeca = meestal 9, zakelijk/software = 21
- "receiptDate": datum in YYYY-MM-DD formaat (zoek naar datum op het bon)
- "category": kies uit: kantoor, reizen, software, maaltijden, abonnement, overig
- "description": korte omschrijving van wat er gekocht is (max 60 tekens)

Laat een veld weg als het niet leesbaar of niet aanwezig is.
Geef ALLEEN het JSON-object terug, niets anders.`

export async function POST(req: NextRequest) {
  // Valideer Bearer token
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Geen token', ocr: null }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { pad, base64, mimeType } = body
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

  if (!pad.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Geen toegang tot dit bestand', ocr: null }, { status: 403 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OCR niet geconfigureerd', ocr: null })

  try {
    // Data URL samenstellen (base64 van mobile, of signed URL als fallback)
    let dataUrl: string

    if (base64 && typeof base64 === 'string' && base64.length > 0) {
      const safeMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
        ? mimeType : 'image/jpeg'
      dataUrl = `data:${safeMime};base64,${base64}`
    } else {
      const { data: signedData, error: storageError } = await supabase.storage
        .from('receipts').createSignedUrl(pad, 3600)
      if (!signedData?.signedUrl) {
        console.error('[OCR] Storage error:', storageError)
        return NextResponse.json({ error: 'Bestand niet gevonden', ocr: null }, { status: 404 })
      }
      const imgRes = await fetch(signedData.signedUrl)
      if (!imgRes.ok) return NextResponse.json({ error: `Download mislukt: ${imgRes.status}`, ocr: null })
      const imgBuffer = await imgRes.arrayBuffer()
      const rawType = imgRes.headers.get('content-type') ?? 'image/jpeg'
      const safeMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        .includes(rawType.split(';')[0]!.trim()) ? rawType.split(';')[0]!.trim() : 'image/jpeg'
      dataUrl = `data:${safeMime};base64,${Buffer.from(imgBuffer).toString('base64')}`
    }

    // OpenAI Vision aanroep — gelogd via verwerkingslogboek
    const ocr = await metAILog(
      { userId: user.id, provider: 'openai', callType: 'ocr', dataCategories: ['bonnetje_afbeelding'], anonymized: false },
      async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 400,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: PROMPT },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
              ],
            }],
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error('[OCR] OpenAI error:', res.status, errText)
          throw new Error(`OpenAI fout: ${res.status}`)
        }

        const json = await res.json()
        const raw = json.choices?.[0]?.message?.content ?? ''
        const match = raw.match(/\{[\s\S]*\}/)
        return match ? JSON.parse(match[0]) : null
      }
    )

    return NextResponse.json({ ocr })
  } catch (e) {
    console.error('[OCR] Exception:', e)
    return NextResponse.json({ error: String(e), ocr: null })
  }
}
