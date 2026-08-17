import { eq } from 'drizzle-orm'

import type { MobileImageAttachment } from '../types/message'
import { appCheckpointTable, type MobileDatabase } from './schema'

export type AppScreen = 'chat' | 'settings'

export interface AppCheckpoint {
  activeTopicId: string
  attachments: MobileImageAttachment[]
  prompt: string
  screen: AppScreen
}

const CHECKPOINT_ID = 'current'

export function loadAppCheckpoint(database: MobileDatabase): AppCheckpoint | undefined {
  const checkpoint = database.select().from(appCheckpointTable).where(eq(appCheckpointTable.id, CHECKPOINT_ID)).get()
  if (!checkpoint) return undefined

  return {
    activeTopicId: checkpoint.activeTopicId,
    attachments: checkpoint.attachments,
    prompt: checkpoint.prompt,
    screen: checkpoint.screen
  }
}

export function saveAppCheckpoint(checkpoint: AppCheckpoint, database: MobileDatabase): void {
  const values = { id: CHECKPOINT_ID, ...checkpoint, updatedAt: Date.now() }
  database
    .insert(appCheckpointTable)
    .values(values)
    .onConflictDoUpdate({
      target: appCheckpointTable.id,
      set: values
    })
    .run()
}
