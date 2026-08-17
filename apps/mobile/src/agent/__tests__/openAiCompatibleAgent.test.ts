import type { Model } from '@earendil-works/pi-ai'
import { convertMessages as convertOpenAiMessages } from '@earendil-works/pi-ai/api/openai-completions'
import { describe, expect, it } from 'vitest'

import type { MobileAgentMessage } from '../../types/message'
import { convertMessagesForLlm } from '../openAiCompatibleAgent'

describe('OpenAI-compatible mobile agent', () => {
  it('loads persisted images into multimodal message parts for the provider request', async () => {
    const message: MobileAgentMessage = {
      role: 'user',
      content: '描述这条消息',
      timestamp: 1_700_000_000_000,
      attachments: [
        {
          fileName: 'private-photo.jpg',
          id: 'attachment-1',
          kind: 'image',
          mimeType: 'image/jpeg',
          uri: 'file:///private/photo.jpg'
        }
      ]
    }

    const converted = await convertMessagesForLlm([message], true, async () => 'base64-image')

    expect(converted).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: '描述这条消息' },
          { type: 'image', data: 'base64-image', mimeType: 'image/jpeg' }
        ],
        timestamp: 1_700_000_000_000
      }
    ])

    const model: Model<'openai-completions'> = {
      id: 'test-model',
      name: 'test-model',
      api: 'openai-completions',
      provider: 'openai-compatible',
      baseUrl: 'https://example.com/v1',
      reasoning: false,
      input: ['text', 'image'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 4_096
    }
    expect(
      convertOpenAiMessages(model, { messages: converted }, {
        requiresAssistantAfterToolResult: false,
        requiresReasoningContentOnAssistantMessages: false,
        requiresThinkingAsText: false
      } as never)
    ).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: '描述这条消息' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,base64-image' } }
        ]
      }
    ])
  })

  it('keeps attachment data out of requests for text-only models', async () => {
    const message: MobileAgentMessage = {
      role: 'user',
      content: '仅发送文字',
      timestamp: 1_700_000_000_000,
      attachments: [
        {
          fileName: 'photo.jpg',
          id: 'attachment-1',
          kind: 'image',
          mimeType: 'image/jpeg',
          uri: 'file:///documents/photo.jpg'
        }
      ]
    }

    await expect(convertMessagesForLlm([message], false, async () => 'unused')).resolves.toEqual([
      { role: 'user', content: [{ type: 'text', text: '仅发送文字' }], timestamp: 1_700_000_000_000 }
    ])
  })
})
