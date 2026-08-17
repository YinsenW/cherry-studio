import { eq } from 'drizzle-orm'

import { getDatabase } from './database'
import { type ProviderRecord, providerTable } from './schema'

export interface ProviderInput {
  apiKey: string
  baseUrl: string
  id: string
  modelId: string
  name: string
}

export function getProvider(id: string): ProviderRecord | undefined {
  return getDatabase().select().from(providerTable).where(eq(providerTable.id, id)).get()
}

export function saveProvider(input: ProviderInput): void {
  const now = Date.now()

  getDatabase()
    .insert(providerTable)
    .values({
      ...input,
      isEnabled: true,
      orderKey: 'p0',
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: providerTable.id,
      set: {
        apiKey: input.apiKey,
        baseUrl: input.baseUrl,
        isEnabled: true,
        modelId: input.modelId,
        name: input.name,
        updatedAt: now
      }
    })
    .run()
}

export function deleteProvider(id: string): void {
  getDatabase().delete(providerTable).where(eq(providerTable.id, id)).run()
}
