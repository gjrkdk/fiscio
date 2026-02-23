import { pgTable, uuid, text, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core'
import { users } from './users'

export type InvoiceLineItem = {
  description: string
  quantity: number
  unit: string        // bijv. 'uur', 'stuk', 'dag', 'maand', 'km'
  unitPrice: number
  vatRate: number
}

// status: draft → sent → paid (or overdue)
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  invoiceNumber: text('invoice_number').notNull(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email'),
  clientAddress: text('client_address'),
  clientKvk: text('client_kvk'),
  clientBtw: text('client_btw'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('draft'),
  dueDate: timestamp('due_date'),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  peppolSentAt: timestamp('peppol_sent_at'),
  lineItems: jsonb('line_items').$type<InvoiceLineItem[]>().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
