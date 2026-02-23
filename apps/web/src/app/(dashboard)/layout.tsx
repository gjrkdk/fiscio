import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { logout } from '@/app/(auth)/login/actions'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ritten', label: 'Ritten' },
  { href: '/kosten', label: 'Kosten' },
  { href: '/facturen', label: 'Facturen' },
  { href: '/klanten', label: 'Klanten' },
  { href: '/btw', label: 'BTW-aangifte' },
  { href: '/instellingen', label: 'Instellingen' },
]

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Fiscio</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Gebruiker + uitloggen */}
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-gray-400 truncate px-3 mb-1">
            {user?.email}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Uitloggen
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  )
}
