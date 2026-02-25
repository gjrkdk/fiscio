import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { aiProcessingLog } from '@fiscio/db'
import { eq, desc } from 'drizzle-orm'

const CALL_TYPE_LABELS: Record<string, string> = {
  ocr: '🧾 Bonnetje scannen',
  classificatie: '🚗 Rit-classificatie',
  chat: '💬 AI-chat',
  tip: '💡 Belastingtip',
  embedding: '🔍 Zoekindex',
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI (GPT-4o mini)',
  anthropic: 'Anthropic (Claude)',
}

export default async function VerwerkingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const logs = await db
    .select()
    .from(aiProcessingLog)
    .where(eq(aiProcessingLog.userId, user.id))
    .orderBy(desc(aiProcessingLog.createdAt))
    .limit(100)

  const totaalPerType = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.callType] = (acc[log.callType] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Gegevensverwerking</h1>
      <p className="text-sm text-gray-500 mb-8">
        Overzicht van alle externe AI-aanroepen die namens jou zijn gedaan (AVG artikel 15 — recht op inzage).
      </p>

      {/* Samenvatting */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Object.entries(totaalPerType).map(([type, count]) => (
          <div key={type} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-xl mb-1">{CALL_TYPE_LABELS[type]?.split(' ')[0]}</div>
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-xs text-gray-500">{CALL_TYPE_LABELS[type]?.slice(2)}</div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="col-span-4 text-center text-gray-400 py-8">
            Nog geen AI-aanroepen geregistreerd
          </div>
        )}
      </div>

      {/* Uitleg */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-blue-800">
        <strong>Privacy-beleid:</strong> Fiscio stuurt geanonimiseerde gegevens naar externe AI-providers
        voor rit-classificatie en belastingtips. Bonnetjes worden als afbeelding verwerkt voor OCR.
        Jouw persoonsgegevens (naam, IBAN, BSN) worden nooit letterlijk meegestuurd.
        OpenAI gebruikt API-data niet voor modeltraining.
      </div>

      {/* Log tabel */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tijdstip</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Provider</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Geanon.</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Duur</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('nl-NL', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {CALL_TYPE_LABELS[log.callType] ?? log.callType}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {PROVIDER_LABELS[log.provider] ?? log.provider}
                  </td>
                  <td className="px-4 py-3">
                    {log.anonymized
                      ? <span className="text-green-600 font-medium">✓ Ja</span>
                      : <span className="text-amber-600 font-medium">Afbeelding</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {log.durationMs ? `${log.durationMs}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
