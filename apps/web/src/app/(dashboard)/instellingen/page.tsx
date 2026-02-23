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
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Instellingen</h2>
      <p className="text-sm text-gray-500 mb-6">
        Je gegevens worden gebruikt op facturen en in het administratiesysteem.
      </p>
      <InstellingenForm profiel={profiel ?? null} email={user.email ?? ''} />
    </div>
  )
}
