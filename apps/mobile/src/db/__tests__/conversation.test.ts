import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MobileAgentMessage } from '../../types/message'
import { loadConversationMessages, saveConversationMessages } from '../conversation'
import { assistantTable, messageTable, topicTable } from '../schema'
import { deleteTopic } from '../topic'
import { createTestDatabase, type TestDatabase } from './testDatabase'

const messages: MobileAgentMessage[] = [
  {
    role: 'user',
    content: [{ type: 'text', text: '请用 **Markdown** 回复。' }],
    deliveryStatus: 'pending',
    attachments: [
      {
        fileName: 'photo.jpg',
        id: 'attachment-1',
        kind: 'image',
        mimeType: 'image/jpeg',
        uri: 'file:///local/photo.jpg'
      }
    ],
    timestamp: 1_700_000_000_000
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: '正在调用工具。' },
      { type: 'toolCall', id: 'call-1', name: 'get_current_time', arguments: {} }
    ],
    api: 'openai-completions',
    provider: 'openai-compatible',
    model: 'test-model',
    usage: {
      input: 4,
      output: 6,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 10,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
    },
    stopReason: 'toolUse',
    timestamp: 1_700_000_001_000
  },
  {
    role: 'toolResult',
    toolCallId: 'call-1',
    toolName: 'get_current_time',
    content: [{ type: 'text', text: '2026-08-17T00:00:00.000Z' }],
    details: { iso: '2026-08-17T00:00:00.000Z' },
    isError: false,
    timestamp: 1_700_000_002_000
  }
]

describe('mobile conversation persistence', () => {
  let testDatabase: TestDatabase | undefined

  afterEach(() => testDatabase?.cleanup())

  it('restores every saved message without losing structured content', async () => {
    testDatabase = await createTestDatabase({ setItemAsync: vi.fn() })
    const now = Date.now()
    testDatabase.database
      .insert(assistantTable)
      .values({
        id: 'assistant-1',
        name: 'Assistant',
        prompt: '',
        emoji: '🍒',
        description: '',
        settings: {},
        orderKey: 'a0',
        createdAt: now,
        updatedAt: now
      })
      .run()
    testDatabase.database
      .insert(topicTable)
      .values({
        id: 'topic-1',
        name: '',
        assistantId: 'assistant-1',
        orderKey: 't0',
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now
      })
      .run()

    saveConversationMessages(messages, 'topic-1', testDatabase.database)

    expect(loadConversationMessages('topic-1', testDatabase.database)).toEqual(messages)
    expect(testDatabase.database.select({ status: messageTable.status }).from(messageTable).get()).toEqual({
      status: 'pending'
    })
  })

  it('cascades message deletion when a topic is deleted', async () => {
    testDatabase = await createTestDatabase({ setItemAsync: vi.fn() })
    const now = Date.now()
    testDatabase.database
      .insert(assistantTable)
      .values({
        id: 'assistant-1',
        name: 'Assistant',
        prompt: '',
        emoji: '🍒',
        description: '',
        settings: {},
        orderKey: 'a0',
        createdAt: now,
        updatedAt: now
      })
      .run()
    testDatabase.database
      .insert(topicTable)
      .values({
        id: 'topic-1',
        name: '',
        assistantId: 'assistant-1',
        orderKey: 't0',
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now
      })
      .run()
    saveConversationMessages(messages, 'topic-1', testDatabase.database)

    deleteTopic('topic-1', testDatabase.database)

    expect(testDatabase.database.select().from(messageTable).all()).toEqual([])
  })
})
