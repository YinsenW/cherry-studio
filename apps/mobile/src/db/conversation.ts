import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { asc, eq } from 'drizzle-orm'

import { DEFAULT_TOPIC_ID, getDatabase } from './database'
import { messageTable, topicTable } from './schema'

function getMessageStatus(message: AgentMessage): 'success' | 'error' {
  return message.role === 'assistant' && message.stopReason === 'error' ? 'error' : 'success'
}

export function loadConversationMessages(topicId = DEFAULT_TOPIC_ID): AgentMessage[] {
  return getDatabase()
    .select({ data: messageTable.data })
    .from(messageTable)
    .where(eq(messageTable.topicId, topicId))
    .orderBy(asc(messageTable.sequence))
    .all()
    .map((row) => row.data)
}

export function saveConversationMessages(messages: AgentMessage[], topicId = DEFAULT_TOPIC_ID): void {
  const database = getDatabase()
  const now = Date.now()

  database.transaction((transaction) => {
    transaction.delete(messageTable).where(eq(messageTable.topicId, topicId)).run()

    let parentId: string | null = null
    for (const [sequence, message] of messages.entries()) {
      const id = `${topicId}:${sequence}`
      transaction
        .insert(messageTable)
        .values({
          id,
          parentId,
          topicId,
          role: message.role,
          data: message,
          status: getMessageStatus(message),
          sequence,
          modelId: message.role === 'assistant' ? `${message.provider}::${message.model}` : null,
          createdAt: message.timestamp,
          updatedAt: now
        })
        .run()
      parentId = id
    }

    transaction
      .update(topicTable)
      .set({ activeNodeId: parentId, lastActivityAt: now, updatedAt: now })
      .where(eq(topicTable.id, topicId))
      .run()
  })
}
