import { customType } from 'drizzle-orm/pg-core'

// pgvector type voor Drizzle — 1536 dimensies (text-embedding-3-small)
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(Number)
  },
})
