import type { AgentStatus, RuntimeEvent } from '@cherrystudio/ai-runtime-contracts'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'

import { createOpenAiCompatibleAgent } from './src/agent/openAiCompatibleAgent'
import { subscribeToRuntimeEvents } from './src/agent/runtimeEventBridge'
import { RuntimeEventLog } from './src/components/RuntimeEventLog'
import i18n from './src/i18n'

export default function App() {
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('gpt-4o-mini')
  const [prompt, setPrompt] = useState(i18n.t('defaultPrompt'))
  const [events, setEvents] = useState<RuntimeEvent[]>([])
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [validationError, setValidationError] = useState('')

  const submit = async () => {
    if (![baseUrl, apiKey, modelId, prompt].every((value) => value.trim())) {
      setValidationError(i18n.t('missingConfig'))
      return
    }

    setAnswer('')
    setEvents([])
    setStatus('running')
    setValidationError('')

    const agent = createOpenAiCompatibleAgent({
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      modelId: modelId.trim()
    })
    const unsubscribe = subscribeToRuntimeEvents(agent, (event) => {
      setEvents((current) => [...current, event])
      if (event.type === 'TEXT_DELTA') setAnswer((current) => current + event.delta)
      if (event.type === 'RUN_STATUS') {
        setStatus(event.status)
        if (event.error) setValidationError(event.error)
      }
    })

    try {
      await agent.prompt(prompt.trim())
    } catch (error) {
      setStatus('error')
      setValidationError(error instanceof Error ? error.message : String(error))
    } finally {
      unsubscribe()
    }
  }

  const running = status === 'running' || status === 'waiting-for-approval'

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('subtitle')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{i18n.t('baseUrl')}</Text>
          <TextInput autoCapitalize="none" onChangeText={setBaseUrl} style={styles.input} value={baseUrl} />
          <Text style={styles.label}>{i18n.t('apiKey')}</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setApiKey}
            placeholder={i18n.t('apiKeyPlaceholder')}
            secureTextEntry
            style={styles.input}
            value={apiKey}
          />
          <Text style={styles.label}>{i18n.t('model')}</Text>
          <TextInput autoCapitalize="none" onChangeText={setModelId} style={styles.input} value={modelId} />
          <Text style={styles.label}>{i18n.t('prompt')}</Text>
          <TextInput
            multiline
            onChangeText={setPrompt}
            style={[styles.input, styles.prompt]}
            textAlignVertical="top"
            value={prompt}
          />
          {validationError ? <Text style={styles.error}>{validationError}</Text> : null}
          <Button disabled={running} onPress={() => void submit()} title={i18n.t('send')} />
          <View style={styles.status}>
            {running ? <ActivityIndicator size="small" /> : null}
            <Text style={styles.statusText}>{running ? i18n.t('running') : i18n.t('status', { status })}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('answer')}</Text>
          <Text selectable style={styles.answer}>
            {answer || i18n.t('noAnswer')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{i18n.t('toolEvents')}</Text>
          <RuntimeEventLog emptyText={i18n.t('noToolEvents')} events={events} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  answer: { color: '#101828', lineHeight: 22 },
  card: { backgroundColor: '#ffffff', borderColor: '#e4e7ec', borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 },
  content: { gap: 16, padding: 20, paddingBottom: 48, paddingTop: 64 },
  error: { color: '#b42318', lineHeight: 20 },
  header: { gap: 6 },
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
  prompt: { minHeight: 92 },
  screen: { backgroundColor: '#f9fafb', flex: 1 },
  sectionTitle: { color: '#101828', fontSize: 17, fontWeight: '600' },
  status: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  statusText: { color: '#475467', fontSize: 13 },
  subtitle: { color: '#667085', lineHeight: 20 },
  title: { color: '#101828', fontSize: 26, fontWeight: '700' }
})
