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

  const S = {
    card: { background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.04)', overflow: 'hidden' as const },
    th: { padding: '0.75rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color: 'oklch(0.55 0.015 255)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: 'oklch(0.98 0.003 255)', textAlign: 'left' as const },
    td: { padding: '0.875rem 1.25rem', fontSize: '0.825rem', color: 'oklch(0.30 0.02 255)', borderBottom: '1px solid oklch(0.96 0.005 255)' },
  }

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em', margin: 0 }}>Gegevensverwerking</h1>
        <p style={{ fontSize: '0.85rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>
          Overzicht van alle externe AI-aanroepen die namens jou zijn gedaan (AVG artikel 15 — recht op inzage).
        </p>
      </div>

      {/* Samenvatting per type */}
      {Object.keys(totaalPerType).length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.875rem' }}>
          {Object.entries(totaalPerType).map(([type, count]) => (
            <div key={type} style={{ background: 'white', borderRadius: '0.875rem', border: '1px solid oklch(0.91 0.01 255)', padding: '1rem 1.25rem', boxShadow: '0 1px 4px oklch(0 0 0 / 0.03)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>{CALL_TYPE_LABELS[type]?.split(' ')[0]}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.25rem' }}>{CALL_TYPE_LABELS[type]?.slice(3)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid oklch(0.91 0.01 255)', padding: '3rem', textAlign: 'center', color: 'oklch(0.60 0.01 255)' }}>
          Nog geen AI-aanroepen geregistreerd
        </div>
      )}

      {/* Privacy uitleg */}
      <div style={{ background: 'oklch(0.95 0.04 255)', border: '1px solid oklch(0.88 0.06 255)', borderRadius: '0.875rem', padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'oklch(0.30 0.12 255)' }}>
        <strong>🔒 Privacy-beleid:</strong> Fiscio stuurt geanonimiseerde gegevens naar externe AI-providers
        voor rit-classificatie en belastingtips. Bonnetjes worden als afbeelding verwerkt voor OCR.
        Jouw persoonsgegevens (naam, IBAN, BSN) worden nooit letterlijk meegestuurd.
        OpenAI gebruikt API-data niet voor modeltraining.
      </div>

      {/* Log tabel */}
      {logs.length > 0 && (
        <div style={S.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {['Tijdstip', 'Type', 'Provider', 'Geanon.', 'Duur'].map((h, i) => (
                  <th key={h} style={{ ...S.th, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ ...S.td, color: 'oklch(0.55 0.015 255)', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={S.td}>{CALL_TYPE_LABELS[log.callType] ?? log.callType}</td>
                  <td style={{ ...S.td, color: 'oklch(0.50 0.01 255)' }}>{PROVIDER_LABELS[log.provider] ?? log.provider}</td>
                  <td style={S.td}>
                    {log.anonymized
                      ? <span style={{ color: 'oklch(0.35 0.18 145)', fontWeight: 600 }}>✓ Ja</span>
                      : <span style={{ color: 'oklch(0.45 0.18 70)', fontWeight: 600 }}>Afbeelding</span>
                    }
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', color: 'oklch(0.60 0.01 255)' }}>
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
