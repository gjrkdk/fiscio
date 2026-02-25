'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

type MaandData = { maand: string; omzet: number; kosten: number; winst: number }
type CatData   = { name: string; value: number }
type StatusData = { name: string; value: number; bedrag: number }

const KLEUREN_PIE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

function euro(n: number) {
  return `€${Math.round(n).toLocaleString('nl-NL')}`
}

// ─── Tooltip stijl ────────────────────────────────────────────────────────
function TooltipOmzet({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {euro(p.value)}
        </p>
      ))}
    </div>
  )
}

function TooltipPie({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold">{payload[0]!.name}</p>
      <p className="text-gray-600">{euro(payload[0]!.value)}</p>
    </div>
  )
}

// ─── Omzet vs Kosten per maand ────────────────────────────────────────────
function OmzetKostenGrafiek({ data }: { data: MaandData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Omzet vs Kosten per maand</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="maand" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip content={<TooltipOmzet />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="omzet" name="Omzet" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="kosten" name="Kosten" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Nettowinst per maand ─────────────────────────────────────────────────
function WinstGrafiek({ data }: { data: MaandData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Nettowinst per maand</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="maand" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip content={<TooltipOmzet />} />
          <Bar
            dataKey="winst"
            name="Winst"
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.winst >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Kosten per categorie ─────────────────────────────────────────────────
function KostenCategorieGrafiek({ data }: { data: CatData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Geen kosten geregistreerd</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Kosten per categorie</h2>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="60%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={KLEUREN_PIE[i % KLEUREN_PIE.length] ?? '#3b82f6'} />
              ))}
            </Pie>
            <Tooltip content={<TooltipPie />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((cat, i) => (
            <div key={cat.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: KLEUREN_PIE[i % KLEUREN_PIE.length] }} />
                <span className="text-gray-700">{cat.name}</span>
              </div>
              <span className="font-medium text-gray-900">{euro(cat.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Factuurstatus ────────────────────────────────────────────────────────
function FactuurStatusGrafiek({ data }: { data: StatusData[] }) {
  if (data.length === 0) return null
  const STATUS_KLEUREN: Record<string, string> = {
    'Betaald': '#10b981', 'Openstaand': '#f59e0b', 'Concept': '#9ca3af', 'Verlopen': '#ef4444',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Factuurstatus</h2>
      <div className="space-y-3">
        {data.map(s => {
          const totaalFacturen = data.reduce((acc, d) => acc + d.value, 0)
          const pct = Math.round((s.value / totaalFacturen) * 100)
          const kleur = STATUS_KLEUREN[s.name] ?? '#9ca3af'
          return (
            <div key={s.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{s.name}</span>
                <span className="text-gray-500">{s.value} facturen · {euro(s.bedrag)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: kleur }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Hoofd export ─────────────────────────────────────────────────────────
export function Grafieken({
  perMaand,
  kostenCategorieën,
  factuurStatus,
}: {
  perMaand: MaandData[]
  kostenCategorieën: CatData[]
  factuurStatus: StatusData[]
}) {
  return (
    <div className="space-y-6">
      <OmzetKostenGrafiek data={perMaand} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WingstGrafiek data={perMaand} />
        <KostenCategorieGrafiek data={kostenCategorieën} />
      </div>
      <FactuurStatusGrafiek data={factuurStatus} />
    </div>
  )
}

// Aliassen (typo-fix)
const WingstGrafiek = WinstGrafiek
