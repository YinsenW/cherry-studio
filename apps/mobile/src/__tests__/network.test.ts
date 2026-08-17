import type { NetInfoState } from '@react-native-community/netinfo'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addEventListener } = vi.hoisted(() => ({ addEventListener: vi.fn() }))

vi.mock('@react-native-community/netinfo', () => ({
  default: { addEventListener }
}))

import { isNetworkAvailable, resolveNetworkFeedback, subscribeToNetworkStatus } from '../network'

function createState(isConnected: boolean | null, isInternetReachable: boolean | null): NetInfoState {
  return { isConnected, isInternetReachable, type: 'unknown', details: null } as NetInfoState
}

describe('mobile network status', () => {
  beforeEach(() => addEventListener.mockReset())

  it('reports offline when the device disconnects or internet reachability fails', () => {
    expect(isNetworkAvailable(createState(false, false))).toBe(false)
    expect(isNetworkAvailable(createState(true, false))).toBe(false)
    expect(isNetworkAvailable(createState(true, null))).toBe(true)
  })

  it('uses the NetInfo subscription and forwards connectivity changes', () => {
    const unsubscribe = vi.fn()
    let listener: ((state: NetInfoState) => void) | undefined
    addEventListener.mockImplementation((nextListener) => {
      listener = nextListener
      return unsubscribe
    })
    const onChange = vi.fn()

    const result = subscribeToNetworkStatus(onChange)
    listener?.(createState(false, false))
    listener?.(createState(true, true))

    expect(onChange.mock.calls).toEqual([[false], [true]])
    expect(result).toBe(unsubscribe)
  })

  it('clears stale offline feedback after connectivity recovers without a retryable message', () => {
    expect(resolveNetworkFeedback(false, true, false)).toBe('clear')
    expect(resolveNetworkFeedback(false, true, true)).toBe('restored')
  })
})
