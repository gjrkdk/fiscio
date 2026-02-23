import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Valideer Bearer token
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Geen token' }, { status: 401 })

  // Haal het opslagpad op uit de request body
  const { pad } = await req.json()
  if (!pad) return NextResponse.json({ error: 'Geen pad' }, { status: 400 })

  // Verifieer token via Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Onbevoegd' }, { status: 401 })

  // Controleer dat het pad bij deze gebruiker hoort
  if (!pad.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  // Signed URL ophalen
  const { data: signedData } = await supabase.storage
    .from('receipts')
    .createSignedUrl(pad, 3600)

  if (!signedData?.signedUrl) {
    return NextResponse.json({ error: 'Bestand niet gevonden' }, { status: 404 })
  }

  // OCR via OpenAI Vision
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ ocr: null })

  try {
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
            { type: 'image_url', image_url: { url: signedData.signedUrl, detail: 'low' } },
          ],
        }],
      }),
    })

    if (!response.ok) return NextResponse.json({ ocr: null })
    const json = await response.json()
    const raw = json.choices?.[0]?.message?.content ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    const ocr = match ? JSON.parse(match[0]) : null
    return NextResponse.json({ ocr })
  } catch {
    return NextResponse.json({ ocr: null })
  }
}
