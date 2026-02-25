import { eq } from 'drizzle-orm'
import { users } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InstellingenForm } from './InstellingenForm'

export default async function InstellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profiel] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Instellingen</h1>
        <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>
          Je gegevens worden gebruikt op facturen en in het administratiesysteem.
        </p>
      </div>
      <InstellingenForm profiel={profiel ?? null} email={user.email ?? ''} />
    </div>
  )
}
