import * as SecureStore from 'expo-secure-store'

export interface ProviderSecretStore {
  deleteItemAsync(key: string): Promise<void>
  getItemAsync(key: string): Promise<string | null>
  setItemAsync(key: string, value: string): Promise<void>
}

export const providerSecretStore: ProviderSecretStore = SecureStore
