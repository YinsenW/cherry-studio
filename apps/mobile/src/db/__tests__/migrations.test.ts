import BetterSqlite3 from 'better-sqlite3'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyMigrations, migrations } from '../migrations'
import { createMigrationDatabase, createTestDatabase, type TestDatabase } from './testDatabase'

describe('mobile database migrations', () => {
  let testDatabase: TestDatabase | undefined

  afterEach(() => testDatabase?.cleanup())

  it('applies the complete ordered migration array to a fresh database', async () => {
    testDatabase = await createTestDatabase({ setItemAsync: vi.fn() })

    expect(migrations.map(({ version }) => version)).toEqual([1, 2])
    expect(testDatabase.sqlite.pragma('user_version', { simple: true })).toBe(2)
    expect(
      testDatabase.sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all()
        .map((row) => (row as { name: string }).name)
    ).toEqual(['assistant', 'message', 'provider', 'topic'])
  })

  it('moves a version 1 provider key to secure storage before removing the plaintext column', async () => {
    const sqlite = new BetterSqlite3(':memory:')
    const migrationDatabase = createMigrationDatabase(sqlite)
    const versionOne = migrations[0]
    if (!versionOne) throw new Error('Version 1 migration is missing')

    sqlite.transaction(() => {
      for (const statement of versionOne.statements) sqlite.exec(statement)
      sqlite.pragma('user_version = 1')
    })()
    sqlite
      .prepare(
        `INSERT INTO provider (
          provider_id, name, base_url, api_key, model_id,
          is_enabled, order_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'openai-compatible',
        'OpenAI Compatible',
        'https://example.com/v1',
        'secret-key',
        'test-model',
        1,
        'p0',
        1,
        1
      )

    const storedSecrets = new Map<string, string>()
    await applyMigrations(migrationDatabase, {
      setItemAsync: async (key, value) => {
        storedSecrets.set(key, value)
      }
    })

    const provider = sqlite.prepare('SELECT api_key_ref AS apiKeyRef FROM provider').get() as { apiKeyRef: string }
    const columns = sqlite.prepare('PRAGMA table_info(provider)').all() as { name: string }[]
    expect(storedSecrets.get(provider.apiKeyRef)).toBe('secret-key')
    expect(columns.map(({ name }) => name)).toContain('api_key_ref')
    expect(columns.map(({ name }) => name)).not.toContain('api_key')
    expect(sqlite.pragma('user_version', { simple: true })).toBe(2)

    sqlite.close()
  })
})
