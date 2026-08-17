import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import { migrations } from './migrations'
import { assistantTable, schema, topicTable } from './schema'

export const DEFAULT_ASSISTANT_ID = 'default-assistant'
export const DEFAULT_TOPIC_ID = 'default-topic'
export const DEFAULT_PROVIDER_ID = 'openai-compatible'

const sqlite = openDatabaseSync('cherry-studio-mobile.db')
const database = drizzle(sqlite, { schema })
let initialized = false

function applyMigrations() {
  const row = sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version')
  const currentVersion = row?.user_version ?? 0
  const latestVersion = migrations.at(-1)?.version ?? 0

  if (currentVersion > latestVersion) {
    throw new Error(`Database version ${currentVersion} is newer than supported version ${latestVersion}`)
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue

    sqlite.withTransactionSync(() => {
      for (const statement of migration.statements) sqlite.execSync(statement)
      sqlite.execSync(`PRAGMA user_version = ${migration.version}`)
    })
  }
}

function seedDefaultConversation() {
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

export function initializeDatabase() {
  if (initialized) return database

  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  applyMigrations()
  seedDefaultConversation()
  initialized = true
  return database
}

export function getDatabase() {
  return initializeDatabase()
}
