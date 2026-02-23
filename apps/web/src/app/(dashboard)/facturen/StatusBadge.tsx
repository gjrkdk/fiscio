const CONFIG = {
  draft:   { label: 'Concept',   cls: 'bg-gray-100 text-gray-600' },
  sent:    { label: 'Verzonden', cls: 'bg-amber-100 text-amber-700' },
  paid:    { label: 'Betaald',   cls: 'bg-green-100 text-green-700' },
  overdue: { label: 'Verlopen',  cls: 'bg-red-100 text-red-600' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as keyof typeof CONFIG] ?? CONFIG.draft
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
