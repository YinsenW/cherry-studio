import { desc, eq, isNull } from 'drizzle-orm'

import { DEFAULT_ASSISTANT_ID, getDatabase } from './database'
import { topicTable } from './schema'

export type TopicRecord = typeof topicTable.$inferSelect

export function listTopics(): TopicRecord[] {
  return getDatabase()
    .select()
    .from(topicTable)
    .where(isNull(topicTable.deletedAt))
    .orderBy(desc(topicTable.lastActivityAt))
    .all()
}

export function createTopic(): TopicRecord {
  const now = Date.now()
  const id = `topic-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  getDatabase()
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

  const topic = getDatabase().select().from(topicTable).where(eq(topicTable.id, id)).get()
  if (!topic) throw new Error('Failed to create topic')
  return topic
}
