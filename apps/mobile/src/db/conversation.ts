import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { asc, eq } from 'drizzle-orm'

import { messageTable, type MobileDatabase, topicTable } from './schema'

function getMessageStatus(message: AgentMessage): 'success' | 'error' {
  return message.role === 'assistant' && message.stopReason === 'error' ? 'error' : 'success'
}

function getTopicName(messages: AgentMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === 'user')
  if (!firstUserMessage) return ''

  const content = firstUserMessage.content
  const text =
    typeof content === 'string'
      ? content
      : content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(' ')
  return text.trim().replace(/\s+/g, ' ').slice(0, 36)
}

export function loadConversationMessages(topicId: string, database: MobileDatabase): AgentMessage[] {
  return database
    .select({ data: messageTable.data })
    .from(messageTable)
    .where(eq(messageTable.topicId, topicId))
    .orderBy(asc(messageTable.sequence))
    .all()
    .map((row) => row.data)
}

export function saveConversationMessages(messages: AgentMessage[], topicId: string, database: MobileDatabase): void {
  const now = Date.now()

  database.transaction((transaction) => {
    const topic = transaction.select({ name: topicTable.name }).from(topicTable).where(eq(topicTable.id, topicId)).get()
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
      .set({
        activeNodeId: parentId,
        lastActivityAt: now,
        name: topic?.name || getTopicName(messages),
        updatedAt: now
      })
      .where(eq(topicTable.id, topicId))
      .run()
  })
}
