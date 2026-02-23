import { eq, asc } from 'drizzle-orm'
import { clients } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KlantModal } from './KlantModal'
import { KlantVerwijderenKnop } from './KlantVerwijderenKnop'

export default async function KlantenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const klantenLijst = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, user.id))
    .orderBy(asc(clients.name))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klanten</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {klantenLijst.length} klant{klantenLijst.length !== 1 ? 'en' : ''} opgeslagen
          </p>
        </div>
        <KlantModal />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {klantenLijst.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏢</p>
            <p className="font-medium text-gray-500">Nog geen klanten</p>
            <p className="text-sm mt-1">Sla klantgegevens op voor sneller facturen maken</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {klantenLijst.map(klant => (
              <div key={klant.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{klant.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {klant.email && <p className="text-xs text-gray-400">{klant.email}</p>}
                    {klant.kvkNumber && <p className="text-xs text-gray-400">KVK: {klant.kvkNumber}</p>}
                    {klant.btwNumber && <p className="text-xs text-gray-400">BTW: {klant.btwNumber}</p>}
                  </div>
                  {klant.address && <p className="text-xs text-gray-400 mt-0.5">{klant.address}</p>}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <KlantModal klant={klant} />
                  <KlantVerwijderenKnop id={klant.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
