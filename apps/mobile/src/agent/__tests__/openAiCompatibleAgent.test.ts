import { describe, expect, it } from 'vitest'

import type { MobileAgentMessage } from '../../types/message'
import { convertMessagesForLlm } from '../openAiCompatibleAgent'

describe('OpenAI-compatible mobile agent', () => {
  it('keeps local attachment metadata out of the model context', () => {
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

    expect(convertMessagesForLlm([message])).toEqual([
      { role: 'user', content: '描述这条消息', timestamp: 1_700_000_000_000 }
    ])
  })
})
