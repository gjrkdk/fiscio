const CONFIG = {
  draft:   { label: '✏️ Concept',   bg: 'oklch(0.95 0.01 255)', color: 'oklch(0.50 0.01 255)' },
  sent:    { label: '📤 Openstaand', bg: 'oklch(0.95 0.04 70)',  color: 'oklch(0.45 0.18 70)' },
  paid:    { label: '✓ Betaald',    bg: 'oklch(0.94 0.05 145)', color: 'oklch(0.35 0.18 145)' },
  overdue: { label: '⚠️ Verlopen',  bg: 'oklch(0.94 0.05 25)',  color: 'oklch(0.40 0.20 25)' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as keyof typeof CONFIG] ?? CONFIG.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.2rem 0.625rem', borderRadius: '2rem',
      fontSize: '0.72rem', fontWeight: 600,
      background: cfg.bg, color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}
