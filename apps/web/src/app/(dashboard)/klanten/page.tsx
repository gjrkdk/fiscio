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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Klanten</h1>
          <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>
            {klantenLijst.length} klant{klantenLijst.length !== 1 ? 'en' : ''} opgeslagen
          </p>
        </div>
        <KlantModal />
      </div>

      <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)', overflow: 'hidden' }}>
        {klantenLijst.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 0.75rem' }}>🏢</p>
            <p style={{ fontWeight: 700, color: 'oklch(0.30 0.02 255)', margin: '0 0 0.375rem' }}>Nog geen klanten</p>
            <p style={{ fontSize: '0.875rem', color: 'oklch(0.55 0.015 255)', margin: '0 0 1.5rem' }}>Sla klantgegevens op voor sneller facturen maken</p>
            <KlantModal />
          </div>
        ) : klantenLijst.map((klant, i) => (
          <div key={klant.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: i < klantenLijst.length - 1 ? '1px solid oklch(0.96 0.005 255)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0, flex: 1 }}>
              {/* Avatar initiaal */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: 'oklch(0.95 0.04 255)', color: 'oklch(0.40 0.22 255)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.875rem', fontWeight: 700,
              }}>
                {klant.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'oklch(0.20 0.02 255)', fontSize: '0.9rem' }}>{klant.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  {klant.email && <span style={{ fontSize: '0.775rem', color: 'oklch(0.55 0.015 255)' }}>{klant.email}</span>}
                  {klant.kvkNumber && <span style={{ fontSize: '0.775rem', color: 'oklch(0.60 0.01 255)' }}>KVK: {klant.kvkNumber}</span>}
                  {klant.address && <span style={{ fontSize: '0.775rem', color: 'oklch(0.60 0.01 255)' }}>{klant.address}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
              <KlantModal klant={klant} />
              <KlantVerwijderenKnop id={klant.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
