import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const pad = req.nextUrl.searchParams.get('pad')
  if (!pad) return NextResponse.json({ error: 'Geen pad' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Controleer dat het pad begint met userId (RLS op app-niveau)
  if (!pad.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const { data } = await supabase.storage.from('receipts').createSignedUrl(pad, 3600)
  if (!data?.signedUrl) return NextResponse.json({ error: 'Bestand niet gevonden' }, { status: 404 })

  return NextResponse.redirect(data.signedUrl)
}
