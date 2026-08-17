import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'

export function isNetworkAvailable(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false
}

export function resolveNetworkFeedback(
  previousIsOnline: boolean | undefined,
  nextIsOnline: boolean,
  hasRetryableMessage: boolean
): 'offline' | 'restored' | 'clear' | 'unchanged' {
  if (!nextIsOnline) return 'offline'
  if (previousIsOnline !== false) return 'unchanged'
  return hasRetryableMessage ? 'restored' : 'clear'
}

export function subscribeToNetworkStatus(onChange: (isOnline: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => onChange(isNetworkAvailable(state)))
}
