import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  address: text('address'),
  kvkNumber: text('kvk_number'),
  btwNumber: text('btw_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
