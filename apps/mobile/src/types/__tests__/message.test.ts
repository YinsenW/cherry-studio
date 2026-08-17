import { describe, expect, it } from 'vitest'

import {
  getRetryableUserMessage,
  type MobileAgentMessage,
  resolveMessageDeliveryStatus,
  setMessageDeliveryStatus
} from '../message'

describe('mobile message delivery status', () => {
  it('returns the latest user message only when its delivery is incomplete', () => {
    const failed: MobileAgentMessage = {
      role: 'user',
      content: 'first',
      deliveryStatus: 'error',
      timestamp: 1
    }
    const sent: MobileAgentMessage = {
      role: 'user',
      content: 'second',
      deliveryStatus: 'sent',
      timestamp: 2
    }

    expect(getRetryableUserMessage([failed])).toBe(failed)
    expect(getRetryableUserMessage([failed, sent])).toBeUndefined()
  })

  it('updates the persisted user message without changing the rest of the conversation', () => {
    const messages: MobileAgentMessage[] = [
      { role: 'user', content: 'retry me', deliveryStatus: 'pending', timestamp: 1 },
      { role: 'user', content: 'leave me', deliveryStatus: 'sent', timestamp: 2 }
    ]

    expect(setMessageDeliveryStatus(messages, 1, 'error')).toEqual([
      { role: 'user', content: 'retry me', deliveryStatus: 'error', timestamp: 1 },
      messages[1]
    ])
  })

  it('does not treat an earlier assistant reply as the response to a failed request', () => {
    const messages: MobileAgentMessage[] = [
      {
        role: 'assistant',
        api: 'openai-completions',
        provider: 'openai-compatible',
        model: 'test-model',
        content: [{ type: 'text', text: 'earlier reply' }],
        stopReason: 'stop',
        timestamp: 1,
        usage: {
          input: 1,
          output: 1,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 2,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
        }
      },
      { role: 'user', content: 'failed before a reply was created', deliveryStatus: 'pending', timestamp: 2 }
    ]

    expect(resolveMessageDeliveryStatus(messages, 2, true)).toBe('error')
    expect(resolveMessageDeliveryStatus(messages, 2, false)).toBe('pending')
  })
})
