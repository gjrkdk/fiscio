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
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Nieuwe factuur</h2>
      <p className="text-sm text-gray-500 mb-6">Vul de gegevens in en sla op als concept of verstuur direct.</p>
      <NieuwFactuurForm klanten={klantenLijst} />
    </div>
  )
}
