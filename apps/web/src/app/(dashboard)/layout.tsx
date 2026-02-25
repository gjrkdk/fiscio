import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { logout } from '@/app/(auth)/login/actions'
import { AIWidget } from '@/components/AIWidget'
import { SidebarNav } from '@/components/SidebarNav'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'oklch(0.97 0.007 255)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 224, background: 'white', borderRight: '1px solid oklch(0.91 0.01 255)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid oklch(0.95 0.005 255)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'oklch(0.52 0.21 255)', letterSpacing: '-0.02em' }}>
              Fiscio
            </span>
          </Link>
          <p style={{ fontSize: '0.7rem', color: 'oklch(0.68 0.01 255)', marginTop: '0.1rem' }}>
            AI-native administratie
          </p>
        </div>

        {/* Nav (client component voor active state) */}
        <SidebarNav />

        {/* Gebruiker */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid oklch(0.95 0.005 255)' }}>
          <p style={{ fontSize: '0.7rem', color: 'oklch(0.68 0.01 255)', marginBottom: '0.5rem', paddingLeft: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
          <form action={logout}>
            <button type="submit" style={{
              width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
              fontSize: '0.8rem', color: 'oklch(0.50 0.015 255)',
              borderRadius: '0.5rem', border: 'none', background: 'none',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.97 0.007 255)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              ↩ Uitloggen
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        {children}
      </main>

      {/* AI widget */}
      <AIWidget />
    </div>
  )
}
