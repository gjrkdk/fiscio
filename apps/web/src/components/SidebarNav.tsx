'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Car, Receipt, FileText, Users,
  Calculator, Lightbulb, Bot, BarChart3, Settings, Shield,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',                  label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/ritten',                     label: 'Ritten',            icon: Car },
  { href: '/kosten',                     label: 'Kosten',            icon: Receipt },
  { href: '/facturen',                   label: 'Facturen',          icon: FileText },
  { href: '/klanten',                    label: 'Klanten',           icon: Users },
  { href: '/btw',                        label: 'BTW-aangifte',      icon: Calculator },
  { href: '/belastingtips',              label: 'Belastingtips',     icon: Lightbulb },
  { href: '/ai-chat',                    label: 'AI-adviseur',       icon: Bot },
  { href: '/rapportages',                label: 'Rapportages',       icon: BarChart3 },
  { href: '/instellingen',               label: 'Instellingen',      icon: Settings },
  { href: '/instellingen/verwerkingen',  label: 'Gegevensverwerking',icon: Shield },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
              fontSize: '0.825rem', fontWeight: isActive ? 600 : 400,
              textDecoration: 'none', transition: 'all 0.15s',
              color: isActive ? 'oklch(0.40 0.22 255)' : 'oklch(0.45 0.015 255)',
              background: isActive ? 'oklch(0.95 0.04 255)' : 'transparent',
              borderLeft: isActive ? '2.5px solid oklch(0.52 0.21 255)' : '2.5px solid transparent',
            }}
          >
            <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
