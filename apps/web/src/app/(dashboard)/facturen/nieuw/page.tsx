import { eq, asc } from 'drizzle-orm'
import { clients } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NieuwFactuurForm } from './NieuwFactuurForm'

export default async function NieuwFactuurPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const klantenLijst = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, user.id))
    .orderBy(asc(clients.name))

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Nieuwe factuur</h1>
        <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>Vul de gegevens in en sla op als concept of verstuur direct.</p>
      </div>
      <NieuwFactuurForm klanten={klantenLijst} />
    </div>
  )
}
