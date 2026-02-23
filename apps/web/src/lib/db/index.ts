import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@fiscio/db'

const connectionString = process.env['DATABASE_URL']!

// Transaction pooler — geen prepare statements
const client = postgres(connectionString, { prepare: false })

export const db = drizzle(client, { schema })
