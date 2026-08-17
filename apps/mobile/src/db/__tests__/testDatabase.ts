import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import BetterSqlite3 from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import { applyMigrations, type MigrationDatabase, type MigrationSecretStore } from '../migrations'
import { type MobileDatabase, schema } from '../schema'

export interface TestDatabase {
  cleanup: () => void
  database: MobileDatabase
  migrationDatabase: MigrationDatabase
  sqlite: BetterSqlite3.Database
}

export function createMigrationDatabase(sqlite: BetterSqlite3.Database): MigrationDatabase {
  return {
    execSync: (source) => sqlite.exec(source),
    getAllSync: <T>(source: string) => sqlite.prepare(source).all() as T[],
    getFirstSync: <T>(source: string) => (sqlite.prepare(source).get() as T | undefined) ?? null,
    withTransactionSync: (task) => sqlite.transaction(task)()
  }
}

export async function createTestDatabase(secretStore: MigrationSecretStore): Promise<TestDatabase> {
  const directory = mkdtempSync(join(tmpdir(), 'cherry-mobile-test-'))
  const sqlite = new BetterSqlite3(join(directory, 'test.db'))
  sqlite.pragma('foreign_keys = ON')
  const migrationDatabase = createMigrationDatabase(sqlite)
  await applyMigrations(migrationDatabase, secretStore)

  return {
    cleanup: () => {
      sqlite.close()
      rmSync(directory, { force: true, recursive: true })
    },
    database: drizzle(sqlite, { schema }),
    migrationDatabase,
    sqlite
  }
}
