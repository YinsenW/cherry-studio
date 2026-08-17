import { describe, expect, it } from 'vitest'

import { getAgentErrorMessage } from '../errorMessage'

describe('mobile agent error messages', () => {
  it.each(['Network request failed', 'fetch failed', 'ETIMEDOUT', 'socket disconnected'])(
    'turns transport failure %s into an actionable network message',
    (error) => {
      expect(getAgentErrorMessage(new Error(error), '请检查网络后重试。')).toBe('请检查网络后重试。')
    }
  )

  it('preserves provider errors that are not network failures', () => {
    expect(getAgentErrorMessage(new Error('Invalid API key'), '请检查网络后重试。')).toBe('Invalid API key')
  })
})
