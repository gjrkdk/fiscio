/**
 * Verwerkingslogboek voor externe AI-calls (AVG artikel 30)
 *
 * Logt elke AI-aanroep naar ai_processing_log.
 * Gebruik: const result = await metAILog({ userId, ... }, () => openaiCall())
 */

import { db } from '@fiscio/db'
import { aiProcessingLog } from '@fiscio/db'

export type AICallType = 'ocr' | 'classificatie' | 'chat' | 'tip' | 'embedding'
export type AIProvider = 'openai' | 'anthropic'

export type AILogOpties = {
  userId: string
  provider: AIProvider
  callType: AICallType
  dataCategories: string[]
  anonymized?: boolean
}

/**
 * Wrapper die een AI-aanroep uitvoert én logt.
 * Bij fout wordt de fout opnieuw gegooid, maar altijd gelogd.
 */
export async function metAILog<T>(
  opties: AILogOpties,
  aanroep: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  let success = true

  try {
    const resultaat = await aanroep()
    return resultaat
  } catch (e) {
    success = false
    throw e
  } finally {
    const duurMs = String(Date.now() - start)
    // Log asynchroon — blokkeer de aanroep niet
    db.insert(aiProcessingLog).values({
      userId: opties.userId,
      provider: opties.provider,
      callType: opties.callType,
      dataCategories: opties.dataCategories,
      anonymized: opties.anonymized ?? true,
      durationMs: duurMs,
      success,
    }).catch((err) => {
      console.error('[AILog] Kon niet loggen:', err)
    })
  }
}
