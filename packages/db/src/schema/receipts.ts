import { pgTable, uuid, text, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core'
import { users } from './users'

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  vendor: text('vendor'),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }),
  category: text('category'), // e.g. 'kantoor', 'reizen', 'software'
  description: text('description'),
  receiptDate: timestamp('receipt_date'),
  imageUrl: text('image_url'),
  ocrData: jsonb('ocr_data'), // raw OCR output
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Receipt = typeof receipts.$inferSelect
export type NewReceipt = typeof receipts.$inferInsert
