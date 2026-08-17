import type { AgentStatus, RuntimeEvent } from '@cherrystudio/ai-runtime-contracts'
import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

import { createOpenAiCompatibleAgent } from './src/agent/openAiCompatibleAgent'
import { subscribeToRuntimeEvents } from './src/agent/runtimeEventBridge'
import { ConversationMessageList } from './src/components/ConversationMessageList'
import { ProviderSettings } from './src/components/ProviderSettings'
import { RuntimeEventLog } from './src/components/RuntimeEventLog'
import { TopicSwitcher } from './src/components/TopicSwitcher'
import { loadConversationMessages, saveConversationMessages } from './src/db/conversation'
import { DEFAULT_PROVIDER_ID, initializeDatabase } from './src/db/database'
import { getProvider, saveProvider } from './src/db/provider'
import { createTopic, listTopics, type TopicRecord } from './src/db/topic'
import i18n from './src/i18n'

type Screen = 'chat' | 'settings'

export default function App() {
  const [screen, setScreen] = useState<Screen>('chat')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('gpt-4o-mini')
  const [providerFeedback, setProviderFeedback] = useState('')
  const [prompt, setPrompt] = useState(i18n.t('defaultPrompt'))
  const [topics, setTopics] = useState<TopicRecord[]>([])
  const [activeTopicId, setActiveTopicId] = useState('')
  const [events, setEvents] = useState<RuntimeEvent[]>([])
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [conversationMessages, setConversationMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [validationError, setValidationError] = useState('')
  const [databaseReady, setDatabaseReady] = useState(false)

  useEffect(() => {
    try {
      initializeDatabase()
      const provider = getProvider(DEFAULT_PROVIDER_ID)
      if (provider) {
        setApiKey(provider.apiKey)
        setBaseUrl(provider.baseUrl)
        setModelId(provider.modelId)
      } else {
        setScreen('settings')
        setProviderFeedback(i18n.t('missingProviderConfig'))
      }

      const storedTopics = listTopics()
      const initialTopic = storedTopics[0] ?? createTopic()
      setTopics(storedTopics.length > 0 ? storedTopics : [initialTopic])
      setActiveTopicId(initialTopic.id)
      setConversationMessages(loadConversationMessages(initialTopic.id))
      setDatabaseReady(true)
    } catch (error) {
      setStatus('error')
      setValidationError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  const selectTopic = (topicId: string) => {
    try {
      setActiveTopicId(topicId)
      setConversationMessages(loadConversationMessages(topicId))
      setEvents([])
      setStreamingAnswer('')
      setStatus('idle')
      setValidationError('')
    } catch (error) {
      setStatus('error')
      setValidationError(error instanceof Error ? error.message : String(error))
    }
  }

  const addTopic = () => {
    try {
      const topic = createTopic()
      setTopics(listTopics())
      selectTopic(topic.id)
    } catch (error) {
      setStatus('error')
      setValidationError(error instanceof Error ? error.message : String(error))
    }
  }

  const saveProviderSettings = () => {
    if (![baseUrl, apiKey, modelId].every((value) => value.trim())) {
      setProviderFeedback(i18n.t('missingProviderConfig'))
      return
    }

    try {
      saveProvider({
        id: DEFAULT_PROVIDER_ID,
        name: 'OpenAI Compatible',
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        modelId: modelId.trim()
      })
      setApiKey(apiKey.trim())
      setBaseUrl(baseUrl.trim())
      setModelId(modelId.trim())
      setProviderFeedback(i18n.t('providerSaved'))
      setValidationError('')
    } catch (error) {
      setProviderFeedback(error instanceof Error ? error.message : String(error))
    }
  }

  const submit = async () => {
    if (![baseUrl, apiKey, modelId].every((value) => value.trim())) {
      const error = i18n.t('missingProviderConfig')
      setValidationError(error)
      setProviderFeedback(error)
      setScreen('settings')
      return
    }
    if (!prompt.trim()) {
      setValidationError(i18n.t('missingPrompt'))
      return
    }
    if (!activeTopicId) return

    const topicId = activeTopicId
    setStreamingAnswer('')
    setEvents([])
    setStatus('running')
    setValidationError('')

    let agent: ReturnType<typeof createOpenAiCompatibleAgent> | undefined
    let unsubscribeEvents: (() => void) | undefined
    let unsubscribePersistence: (() => void) | undefined

    try {
      const activeAgent = createOpenAiCompatibleAgent({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        messages: conversationMessages,
        modelId: modelId.trim()
      })
      agent = activeAgent
      unsubscribeEvents = subscribeToRuntimeEvents(activeAgent, (event) => {
        setEvents((current) => [...current, event])
        if (event.type === 'TEXT_DELTA') setStreamingAnswer((current) => current + event.delta)
        if (event.type === 'RUN_STATUS') {
          setStatus(event.status)
          if (event.error) setValidationError(event.error)
        }
      })
      unsubscribePersistence = activeAgent.subscribe((event) => {
        if (event.type !== 'message_end') return
        const messages = [...activeAgent.state.messages]
        saveConversationMessages(messages, topicId)
        setConversationMessages(messages)
        setTopics(listTopics())
        if (event.message.role === 'assistant') setStreamingAnswer('')
      })
      await activeAgent.prompt(prompt.trim())
      setPrompt('')
    } catch (error) {
      setStatus('error')
      setValidationError(error instanceof Error ? error.message : String(error))
    } finally {
      unsubscribePersistence?.()
      unsubscribeEvents?.()
      if (agent) {
        try {
          const messages = [...agent.state.messages]
          saveConversationMessages(messages, topicId)
          setConversationMessages(messages)
          setTopics(listTopics())
          setStreamingAnswer('')
        } catch (error) {
          setStatus('error')
          setValidationError(error instanceof Error ? error.message : String(error))
        }
      }
    }
  }

  const running = status === 'running' || status === 'waiting-for-approval'
  const activeTopic = topics.find((topic) => topic.id === activeTopicId)

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('subtitle')}</Text>
          <View style={styles.tabs}>
            <TouchableOpacity
              disabled={running}
              onPress={() => setScreen('chat')}
              style={[styles.tab, screen === 'chat' && styles.activeTab]}>
              <Text style={[styles.tabText, screen === 'chat' && styles.activeTabText]}>{i18n.t('chatTab')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={running}
              onPress={() => setScreen('settings')}
              style={[styles.tab, screen === 'settings' && styles.activeTab]}>
              <Text style={[styles.tabText, screen === 'settings' && styles.activeTabText]}>
                {i18n.t('settingsTab')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {screen === 'settings' ? (
          <ProviderSettings
            apiKey={apiKey}
            baseUrl={baseUrl}
            feedback={providerFeedback}
            modelId={modelId}
            onApiKeyChange={setApiKey}
            onBaseUrlChange={setBaseUrl}
            onModelIdChange={setModelId}
            onSave={saveProviderSettings}
          />
        ) : (
          <>
            <View style={styles.card}>
              <TopicSwitcher
                activeTopicId={activeTopicId}
                disabled={!databaseReady || running}
                onCreate={addTopic}
                onSelect={selectTopic}
                topics={topics}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{activeTopic?.name || i18n.t('untitledTopic')}</Text>
              <ConversationMessageList messages={conversationMessages} />
              {streamingAnswer ? (
                <View style={styles.streaming}>
                  <Text style={styles.streamingLabel}>{i18n.t('streamingAnswer')}</Text>
                  <Text selectable style={styles.streamingText}>
                    {streamingAnswer}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{i18n.t('prompt')}</Text>
              <TextInput
                editable={!running}
                multiline
                onChangeText={setPrompt}
                style={[styles.input, styles.prompt]}
                textAlignVertical="top"
                value={prompt}
              />
              {validationError ? <Text style={styles.error}>{validationError}</Text> : null}
              <Button disabled={!databaseReady || running} onPress={() => void submit()} title={i18n.t('send')} />
              <View style={styles.status}>
                {running ? <ActivityIndicator size="small" /> : null}
                <Text style={styles.statusText}>
                  {!databaseReady ? i18n.t('initializing') : running ? i18n.t('running') : i18n.t('status', { status })}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{i18n.t('toolEvents')}</Text>
              <RuntimeEventLog emptyText={i18n.t('noToolEvents')} events={events} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  activeTab: { backgroundColor: '#175cd3' },
  activeTabText: { color: '#ffffff' },
  card: { backgroundColor: '#ffffff', borderColor: '#e4e7ec', borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 },
  content: { gap: 16, padding: 20, paddingBottom: 48, paddingTop: 64 },
  error: { color: '#b42318', lineHeight: 20 },
  header: { gap: 10 },
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
  streaming: { backgroundColor: '#eff8ff', borderRadius: 12, gap: 4, padding: 12 },
  streamingLabel: { color: '#175cd3', fontSize: 12, fontWeight: '600' },
  streamingText: { color: '#1849a9', lineHeight: 21 },
  subtitle: { color: '#667085', lineHeight: 20 },
  tab: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 9 },
  tabText: { color: '#475467', fontWeight: '600' },
  tabs: { backgroundColor: '#eaecf0', borderRadius: 10, flexDirection: 'row', padding: 3 },
  title: { color: '#101828', fontSize: 26, fontWeight: '700' }
})
