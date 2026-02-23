import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Lazy initialisatie — verbinding wordt pas aangemaakt bij eerste gebruik (runtime),
// niet bij module-import (build-tijd). Voorkomt build-fouten op Vercel.
let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (_db) return _db

  const connectionString = process.env['DATABASE_URL']
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, { prepare: false })
  _db = drizzle(client, { schema })
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export type Database = typeof db
