import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  kvkNumber: text('kvk_number'),
  btwNumber: text('btw_number'),
  iban: text('iban'),
  companyName: text('company_name'),
  address: text('address'),
  zipCode: text('zip_code'),
  city: text('city'),
  urenHuidigJaar: integer('uren_huidig_jaar').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
