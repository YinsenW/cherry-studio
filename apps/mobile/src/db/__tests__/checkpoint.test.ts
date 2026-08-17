import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadAppCheckpoint, saveAppCheckpoint } from '../checkpoint'
import { createTestDatabase, type TestDatabase } from './testDatabase'

describe('mobile app checkpoint', () => {
  let testDatabase: TestDatabase | undefined

  afterEach(() => testDatabase?.cleanup())

  it('restores navigation, draft text, active topic, and pending attachments', async () => {
    testDatabase = await createTestDatabase({ setItemAsync: vi.fn() })
    const checkpoint = {
      activeTopicId: 'topic-1',
      attachments: [
        {
          fileName: 'photo.jpg',
          height: 900,
          id: 'attachment-1',
          kind: 'image' as const,
          mimeType: 'image/jpeg',
          uri: 'file:///local/photo.jpg',
          width: 1200
        }
      ],
      prompt: '尚未发送的草稿',
      screen: 'chat' as const
    }

    saveAppCheckpoint(checkpoint, testDatabase.database)

    expect(loadAppCheckpoint(testDatabase.database)).toEqual(checkpoint)
  })
})
