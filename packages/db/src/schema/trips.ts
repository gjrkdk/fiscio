import { pgTable, uuid, text, timestamp, decimal, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  startAddress: text('start_address').notNull(),
  endAddress: text('end_address').notNull(),
  distanceKm: decimal('distance_km', { precision: 8, scale: 2 }).notNull(),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at').notNull(),
  isBusinessTrip: boolean('is_business_trip').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Trip = typeof trips.$inferSelect
export type NewTrip = typeof trips.$inferInsert
