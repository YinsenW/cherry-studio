import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'

export function isNetworkAvailable(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false
}

export function subscribeToNetworkStatus(onChange: (isOnline: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => onChange(isNetworkAvailable(state)))
}
