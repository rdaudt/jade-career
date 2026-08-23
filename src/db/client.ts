import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  return drizzle(client, { schema })
}

let _db: LibSQLDatabase<typeof schema> | null = null

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) _db = createDb()
  return _db
}
