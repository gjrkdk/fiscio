// ─── Gedeelde UI componenten (server-compatible) ─────────────────────────
import type { ReactNode } from 'react'

// ─── PageHeader ───────────────────────────────────────────────────────────
export function PageHeader({ titel, subtitel, actie }: {
  titel: string; subtitel?: string; actie?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>{titel}</h1>
        {subtitel && <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>{subtitel}</p>}
      </div>
      {actie && <div style={{ flexShrink: 0 }}>{actie}</div>}
    </div>
  )
}

// ─── StatCard ────────────────────────────────────────────────────────────
export function StatCard({ label, waarde, sub, icon, kleur = 'blue' }: {
  label: string; waarde: string | number; sub?: string; icon?: string; kleur?: 'blue' | 'green' | 'orange' | 'purple' | 'red'
}) {
  const kleuren = {
    blue:   { bg: 'oklch(0.95 0.04 255)', icon: 'oklch(0.52 0.21 255)', text: 'oklch(0.40 0.22 255)' },
    green:  { bg: 'oklch(0.95 0.05 145)', icon: 'oklch(0.50 0.18 145)', text: 'oklch(0.38 0.18 145)' },
    orange: { bg: 'oklch(0.96 0.04 70)',  icon: 'oklch(0.60 0.18 70)',  text: 'oklch(0.48 0.18 70)' },
    purple: { bg: 'oklch(0.95 0.04 290)', icon: 'oklch(0.52 0.20 290)', text: 'oklch(0.40 0.20 290)' },
    red:    { bg: 'oklch(0.96 0.04 25)',  icon: 'oklch(0.55 0.20 25)',  text: 'oklch(0.43 0.20 25)' },
  }
  const k = kleuren[kleur]

  return (
    <div style={{
      background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem',
      border: '1px solid oklch(0.91 0.01 255)',
      boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        {icon && (
          <span style={{ width: 32, height: 32, borderRadius: '0.5rem', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
            {icon}
          </span>
        )}
      </div>
      <p style={{ fontSize: '1.625rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', lineHeight: 1 }}>{waarde}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'oklch(0.60 0.01 255)', marginTop: '0.375rem' }}>{sub}</p>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────
const BADGE_STIJLEN = {
  paid:       { bg: 'oklch(0.94 0.05 145)', text: 'oklch(0.35 0.18 145)', label: '✓ Betaald' },
  sent:       { bg: 'oklch(0.95 0.04 70)',  text: 'oklch(0.45 0.18 70)',  label: '📤 Verzonden' },
  draft:      { bg: 'oklch(0.95 0.01 255)', text: 'oklch(0.55 0.01 255)', label: '✏️ Concept' },
  overdue:    { bg: 'oklch(0.94 0.05 25)',  text: 'oklch(0.40 0.20 25)',  label: '⚠️ Verlopen' },
  zakelijk:   { bg: 'oklch(0.95 0.04 255)', text: 'oklch(0.40 0.22 255)', label: '🏢 Zakelijk' },
  prive:      { bg: 'oklch(0.95 0.01 255)', text: 'oklch(0.50 0.01 255)', label: '🏠 Privé' },
}

export function Badge({ type }: { type: keyof typeof BADGE_STIJLEN }) {
  const s = BADGE_STIJLEN[type] ?? BADGE_STIJLEN.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.2rem 0.625rem', borderRadius: '2rem',
      fontSize: '0.72rem', fontWeight: 600,
      background: s.bg, color: s.text,
    }}>
      {s.label}
    </span>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────
export function EmptyState({ icon, titel, tekst, actie }: {
  icon: string; titel: string; tekst: string; actie?: ReactNode
}) {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ fontSize: '3rem', filter: 'grayscale(0.2)' }}>{icon}</div>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: 'oklch(0.30 0.02 255)', margin: 0 }}>{titel}</p>
      <p style={{ fontSize: '0.875rem', color: 'oklch(0.55 0.015 255)', margin: 0, maxWidth: 280, lineHeight: 1.6 }}>{tekst}</p>
      {actie && <div style={{ marginTop: '0.5rem' }}>{actie}</div>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────
export function Card({ children, padding = '1.5rem' }: { children: ReactNode; padding?: string }) {
  return (
    <div style={{
      background: 'white', borderRadius: '1rem',
      border: '1px solid oklch(0.91 0.01 255)',
      boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)',
      overflow: 'hidden', padding,
    }}>
      {children}
    </div>
  )
}

// ─── PrimaryButton ────────────────────────────────────────────────────────
export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  const { default: Link } = require('next/link')
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
      padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
      background: 'oklch(0.52 0.21 255)', color: 'white',
      fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
      boxShadow: '0 2px 8px oklch(0.52 0.21 255 / 0.25)',
      transition: 'all 0.15s',
    }}>
      {children}
    </Link>
  )
}

// ─── Tabel ────────────────────────────────────────────────────────────────
export function Tabel({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', overflow: 'hidden', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid oklch(0.93 0.01 255)', background: 'oklch(0.98 0.003 255)' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function TabelRij({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid oklch(0.96 0.005 255)', background: highlight ? 'oklch(0.98 0.003 255)' : 'white', transition: 'background 0.1s' }}>
      {children}
    </tr>
  )
}

export function TabelCel({ children, vet = false, rechts = false, subtiel = false }: {
  children: ReactNode; vet?: boolean; rechts?: boolean; subtiel?: boolean
}) {
  return (
    <td style={{
      padding: '0.875rem 1.25rem',
      fontWeight: vet ? 600 : 400,
      textAlign: rechts ? 'right' : 'left',
      color: subtiel ? 'oklch(0.55 0.015 255)' : 'oklch(0.20 0.02 255)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  )
}
