import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'
import { users } from './users'

export const aiProcessingLog = pgTable('ai_processing_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  provider: text('provider').notNull(),          // 'openai' | 'anthropic'
  callType: text('call_type').notNull(),          // 'ocr' | 'classificatie' | 'chat' | 'tip'
  dataCategories: jsonb('data_categories')        // ['bonnetje', 'rit', 'factuur', ...]
    .notNull()
    .default([]),
  anonymized: boolean('anonymized').notNull().default(true),
  durationMs: text('duration_ms'),               // response tijd
  success: boolean('success').notNull().default(true),
})
