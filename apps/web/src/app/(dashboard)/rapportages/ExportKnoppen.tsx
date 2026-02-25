'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ExportType = 'jaaroverzicht' | 'facturen' | 'bonnetjes' | 'ritten'

const EXPORTS = [
  { type: 'jaaroverzicht' as ExportType, label: 'Jaaroverzicht',  icon: '📋', beschrijving: 'Samenvatting per maand + kwartaal' },
  { type: 'facturen'      as ExportType, label: 'Facturen',       icon: '🧾', beschrijving: 'Alle facturen met status en bedragen' },
  { type: 'bonnetjes'     as ExportType, label: 'Kosten',         icon: '💳', beschrijving: 'Alle bonnetjes per categorie' },
  { type: 'ritten'        as ExportType, label: 'Ritten',         icon: '🚗', beschrijving: 'Zakelijke ritten + km-vergoeding' },
]

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export function ExportKnoppen({ jaar }: { jaar: number }) {
  const [bezig, setBezig] = useState<string | null>(null)

  async function downloadCSV(type: ExportType) {
    setBezig(`csv-${type}`)
    try {
      const token = await getToken()
      const res = await fetch(`/api/export/csv?type=${type}&jaar=${jaar}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Download mislukt')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `fiscio-${type}-${jaar}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Download mislukt. Probeer opnieuw.')
    } finally {
      setBezig(null)
    }
  }

  async function downloadPDF() {
    setBezig('pdf')
    try {
      const token = await getToken()
      const res = await fetch(`/api/export/pdf?jaar=${jaar}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('PDF mislukt')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `fiscio-jaaroverzicht-${jaar}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF genereren mislukt. Probeer opnieuw.')
    } finally {
      setBezig(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Exporteren</h2>
      <p className="text-sm text-gray-500 mb-5">Download jouw financiële data voor de belastingaangifte of boekhouder</p>

      {/* PDF jaaroverzicht */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-blue-900 text-sm">📄 PDF Jaaroverzicht {jaar}</p>
          <p className="text-xs text-blue-600 mt-0.5">Volledig financieel rapport — KPI's, kwartalen, kosten, belastingschatting</p>
        </div>
        <button
          onClick={downloadPDF}
          disabled={bezig !== null}
          className="shrink-0 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {bezig === 'pdf' ? '⏳ Laden...' : 'Download PDF'}
        </button>
      </div>

      {/* CSV exports */}
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">CSV exports (Excel-compatibel)</p>
      <div className="grid grid-cols-2 gap-3">
        {EXPORTS.map(exp => (
          <button
            key={exp.type}
            onClick={() => downloadCSV(exp.type)}
            disabled={bezig !== null}
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition text-left"
          >
            <span className="text-xl">{exp.icon}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {bezig === `csv-${exp.type}` ? '⏳ Laden...' : exp.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{exp.beschrijving}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
