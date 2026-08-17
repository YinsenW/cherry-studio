import { eq } from 'drizzle-orm'

import type { ProviderSecretStore } from './providerSecretStore'
import { type MobileDatabase, type ProviderRecord, providerTable } from './schema'

export interface ProviderInput {
  apiKey: string
  baseUrl: string
  id: string
  modelId: string
  name: string
  supportsImages: boolean
}

export interface Provider extends Omit<ProviderRecord, 'apiKeyRef'> {
  apiKey: string
}

function createApiKeyRef(): string {
  return `provider.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`
}

export async function getProvider(
  id: string,
  database: MobileDatabase,
  secretStore: ProviderSecretStore
): Promise<Provider | undefined> {
  const record = database.select().from(providerTable).where(eq(providerTable.id, id)).get()
  if (!record) return undefined

  const { apiKeyRef, ...provider } = record
  return { ...provider, apiKey: (await secretStore.getItemAsync(apiKeyRef)) ?? '' }
}

export async function saveProvider(
  input: ProviderInput,
  database: MobileDatabase,
  secretStore: ProviderSecretStore
): Promise<void> {
  const now = Date.now()
  const existing = database
    .select({ apiKeyRef: providerTable.apiKeyRef })
    .from(providerTable)
    .where(eq(providerTable.id, input.id))
    .get()
  const apiKeyRef = existing?.apiKeyRef ?? createApiKeyRef()

  await secretStore.setItemAsync(apiKeyRef, input.apiKey)

  database
    .insert(providerTable)
    .values({
      apiKeyRef,
      baseUrl: input.baseUrl,
      id: input.id,
      isEnabled: true,
      modelId: input.modelId,
      name: input.name,
      orderKey: 'p0',
      supportsImages: input.supportsImages,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: providerTable.id,
      set: {
        baseUrl: input.baseUrl,
        isEnabled: true,
        modelId: input.modelId,
        name: input.name,
        supportsImages: input.supportsImages,
        updatedAt: now
      }
    })
    .run()
}

export async function deleteProvider(
  id: string,
  database: MobileDatabase,
  secretStore: ProviderSecretStore
): Promise<void> {
  const record = database
    .select({ apiKeyRef: providerTable.apiKeyRef })
    .from(providerTable)
    .where(eq(providerTable.id, id))
    .get()
  database.delete(providerTable).where(eq(providerTable.id, id)).run()
  if (record) await secretStore.deleteItemAsync(record.apiKeyRef)
}
