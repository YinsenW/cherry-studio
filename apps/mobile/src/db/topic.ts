import { desc, eq, isNull } from 'drizzle-orm'

import { DEFAULT_ASSISTANT_ID } from './constants'
import { type MobileDatabase, topicTable } from './schema'

export type TopicRecord = typeof topicTable.$inferSelect

export function listTopics(database: MobileDatabase): TopicRecord[] {
  return database
    .select()
    .from(topicTable)
    .where(isNull(topicTable.deletedAt))
    .orderBy(desc(topicTable.lastActivityAt))
    .all()
}

export function createTopic(database: MobileDatabase): TopicRecord {
  const now = Date.now()
  const id = `topic-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  database
    .insert(topicTable)
    .values({
      id,
      name: '',
      assistantId: DEFAULT_ASSISTANT_ID,
      orderKey: `t-${now}`,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now
    })
    .run()

  const topic = database.select().from(topicTable).where(eq(topicTable.id, id)).get()
  if (!topic) throw new Error('Failed to create topic')
  return topic
}

export function renameTopic(id: string, name: string, database: MobileDatabase): void {
  database
    .update(topicTable)
    .set({ isNameManuallyEdited: true, name: name.trim(), updatedAt: Date.now() })
    .where(eq(topicTable.id, id))
    .run()
}

export function deleteTopic(id: string, database: MobileDatabase): void {
  database.delete(topicTable).where(eq(topicTable.id, id)).run()
}
