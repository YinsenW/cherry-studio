import { afterEach, describe, expect, it, vi } from 'vitest'

import { getProvider, saveProvider } from '../provider'
import type { ProviderSecretStore } from '../providerSecretStore'
import { providerTable } from '../schema'
import { createTestDatabase, type TestDatabase } from './testDatabase'

function createSecretStore(): ProviderSecretStore {
  const values = new Map<string, string>()
  return {
    deleteItemAsync: async (key) => {
      values.delete(key)
    },
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      values.set(key, value)
    }
  }
}

describe('mobile provider persistence', () => {
  let testDatabase: TestDatabase | undefined

  afterEach(() => testDatabase?.cleanup())

  it('stores only the key reference in SQLite and restores the key asynchronously', async () => {
    const secretStore = createSecretStore()
    testDatabase = await createTestDatabase({ setItemAsync: vi.fn() })

    await saveProvider(
      {
        id: 'openai-compatible',
        name: 'OpenAI Compatible',
        apiKey: 'secret-key',
        baseUrl: 'https://example.com/v1',
        modelId: 'test-model'
      },
      testDatabase.database,
      secretStore
    )

    const row = testDatabase.database.select().from(providerTable).get()
    expect(row?.apiKeyRef).toMatch(/^provider\.[a-z0-9]+\.[a-z0-9]+$/)
    await expect(getProvider('openai-compatible', testDatabase.database, secretStore)).resolves.toMatchObject({
      apiKey: 'secret-key',
      baseUrl: 'https://example.com/v1',
      modelId: 'test-model'
    })
  })
})
