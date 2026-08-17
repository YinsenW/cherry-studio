import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import { DEFAULT_ASSISTANT_ID, DEFAULT_TOPIC_ID } from './constants'
import { applyMigrations } from './migrations'
import { providerSecretStore } from './providerSecretStore'
import { assistantTable, schema, topicTable } from './schema'

let database: ExpoSQLiteDatabase<typeof schema> | undefined
let initialization: Promise<ExpoSQLiteDatabase<typeof schema>> | undefined

function seedDefaultConversation(database: ExpoSQLiteDatabase<typeof schema>) {
  const now = Date.now()

  database.transaction((transaction) => {
    transaction
      .insert(assistantTable)
      .values({
        id: DEFAULT_ASSISTANT_ID,
        name: 'Mobile Assistant',
        prompt:
          'You are a helpful mobile assistant. Use available tools when the user asks for information they provide.',
        emoji: '🍒',
        description: '',
        settings: {},
        orderKey: 'a0',
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoNothing()
      .run()

    transaction
      .insert(topicTable)
      .values({
        id: DEFAULT_TOPIC_ID,
        name: '',
        assistantId: DEFAULT_ASSISTANT_ID,
        orderKey: 't0',
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoNothing()
      .run()
  })
}

export function initializeDatabase(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  if (initialization) return initialization

  initialization = (async () => {
    const sqlite = openDatabaseSync('cherry-studio-mobile.db')
    const initializedDatabase = drizzle(sqlite, { schema })
    sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    await applyMigrations(sqlite, providerSecretStore)
    seedDefaultConversation(initializedDatabase)
    database = initializedDatabase
    return initializedDatabase
  })()

  return initialization
}

export function getDatabase() {
  if (!database) throw new Error('Database has not been initialized')
  return database
}
