import { Button, StyleSheet, Switch, Text, TextInput, View } from 'react-native'

import i18n from '../i18n'

interface ProviderSettingsProps {
  apiKey: string
  baseUrl: string
  feedback: string
  modelId: string
  onApiKeyChange: (value: string) => void
  onBaseUrlChange: (value: string) => void
  onModelIdChange: (value: string) => void
  onSave: () => void
  onSupportsImagesChange: (value: boolean) => void
  supportsImages: boolean
}

export function ProviderSettings({
  apiKey,
  baseUrl,
  feedback,
  modelId,
  onApiKeyChange,
  onBaseUrlChange,
  onModelIdChange,
  onSave,
  onSupportsImagesChange,
  supportsImages
}: ProviderSettingsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{i18n.t('providerSettings')}</Text>
      <Text style={styles.description}>{i18n.t('providerDescription')}</Text>
      <Text style={styles.label}>{i18n.t('baseUrl')}</Text>
      <TextInput autoCapitalize="none" onChangeText={onBaseUrlChange} style={styles.input} value={baseUrl} />
      <Text style={styles.label}>{i18n.t('apiKey')}</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={onApiKeyChange}
        placeholder={i18n.t('apiKeyPlaceholder')}
        secureTextEntry
        style={styles.input}
        value={apiKey}
      />
      <Text style={styles.label}>{i18n.t('model')}</Text>
      <TextInput autoCapitalize="none" onChangeText={onModelIdChange} style={styles.input} value={modelId} />
      <View style={styles.capabilityRow}>
        <View style={styles.capabilityText}>
          <Text style={styles.label}>{i18n.t('supportsImages')}</Text>
          <Text style={styles.description}>{i18n.t('supportsImagesDescription')}</Text>
        </View>
        <Switch
          accessibilityLabel={i18n.t('supportsImages')}
          onValueChange={onSupportsImagesChange}
          value={supportsImages}
        />
      </View>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <Button onPress={onSave} title={i18n.t('saveProvider')} />
    </View>
  )
}

const styles = StyleSheet.create({
  capabilityRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  capabilityText: { flex: 1 },
  card: { backgroundColor: '#ffffff', borderColor: '#e4e7ec', borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 },
  description: { color: '#667085', lineHeight: 20 },
  feedback: { color: '#175cd3', lineHeight: 20 },
  input: {
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    color: '#101828',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  label: { color: '#344054', fontSize: 13, fontWeight: '600', marginTop: 4 },
  title: { color: '#101828', fontSize: 20, fontWeight: '700' }
})
