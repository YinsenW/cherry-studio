import type { AgentStatus, RuntimeEvent } from '@cherrystudio/ai-runtime-contracts'
import type { Agent } from '@earendil-works/pi-agent-core'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  Button,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

import { getAgentErrorMessage } from './src/agent/errorMessage'
import { createOpenAiCompatibleAgent } from './src/agent/openAiCompatibleAgent'
import { subscribeToRuntimeEvents } from './src/agent/runtimeEventBridge'
import { ConversationMessageList } from './src/components/ConversationMessageList'
import { ProviderSettings } from './src/components/ProviderSettings'
import { RuntimeEventLog } from './src/components/RuntimeEventLog'
import { TopicSwitcher } from './src/components/TopicSwitcher'
import { type AppScreen, loadAppCheckpoint, saveAppCheckpoint } from './src/db/checkpoint'
import { DEFAULT_PROVIDER_ID } from './src/db/constants'
import { loadConversationMessages, saveConversationMessages } from './src/db/conversation'
import { getDatabase, initializeDatabase } from './src/db/database'
import { getProvider, saveProvider } from './src/db/provider'
import { providerSecretStore } from './src/db/providerSecretStore'
import { createTopic, deleteTopic, listTopics, renameTopic, type TopicRecord } from './src/db/topic'
import i18n from './src/i18n'
import type { MobileAgentMessage, MobileImageAttachment } from './src/types/message'

function getErrorMessage(error: unknown): string {
  return getAgentErrorMessage(error, i18n.t('networkError'))
}

function getAgentMessages(agent: Agent): MobileAgentMessage[] {
  return agent.state.messages as MobileAgentMessage[]
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('chat')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('gpt-4o-mini')
  const [providerFeedback, setProviderFeedback] = useState('')
  const [prompt, setPrompt] = useState(i18n.t('defaultPrompt'))
  const [pendingAttachments, setPendingAttachments] = useState<MobileImageAttachment[]>([])
  const [topics, setTopics] = useState<TopicRecord[]>([])
  const [activeTopicId, setActiveTopicId] = useState('')
  const [events, setEvents] = useState<RuntimeEvent[]>([])
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [conversationMessages, setConversationMessages] = useState<MobileAgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [validationError, setValidationError] = useState('')
  const [databaseReady, setDatabaseReady] = useState(false)
  const activeAgent = useRef<Agent | undefined>(undefined)
  const databaseReadyRef = useRef(false)
  const checkpointTask = useRef(Promise.resolve())
  const streamingBuffer = useRef('')
  const streamingFrame = useRef<ReturnType<typeof requestAnimationFrame> | undefined>(undefined)
  const latestState = useRef({ activeTopicId, conversationMessages, pendingAttachments, prompt, screen })
  latestState.current = { activeTopicId, conversationMessages, pendingAttachments, prompt, screen }

  const clearStreamingAnswer = () => {
    streamingBuffer.current = ''
    if (streamingFrame.current !== undefined) cancelAnimationFrame(streamingFrame.current)
    streamingFrame.current = undefined
    setStreamingAnswer('')
  }

  const queueStreamingAnswer = (text: string, replace = false) => {
    streamingBuffer.current = replace ? text : streamingBuffer.current + text
    if (streamingFrame.current !== undefined) return

    streamingFrame.current = requestAnimationFrame(() => {
      streamingFrame.current = undefined
      setStreamingAnswer(streamingBuffer.current)
    })
  }

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      try {
        await initializeDatabase()
        const database = getDatabase()
        const provider = await getProvider(DEFAULT_PROVIDER_ID, database, providerSecretStore)
        if (cancelled) return

        if (provider) {
          setApiKey(provider.apiKey)
          setBaseUrl(provider.baseUrl)
          setModelId(provider.modelId)
        }

        const checkpoint = loadAppCheckpoint(database)
        const storedTopics = listTopics(database)
        const fallbackTopic = storedTopics[0] ?? createTopic(database)
        const initialTopic = storedTopics.find((topic) => topic.id === checkpoint?.activeTopicId) ?? fallbackTopic
        setTopics(storedTopics.length > 0 ? storedTopics : [fallbackTopic])
        setActiveTopicId(initialTopic.id)
        setConversationMessages(loadConversationMessages(initialTopic.id, database))
        if (checkpoint) {
          setPendingAttachments(checkpoint.attachments)
          setPrompt(checkpoint.prompt)
          setScreen(checkpoint.screen)
        }
        if (!provider?.apiKey) {
          setScreen('settings')
          setProviderFeedback(i18n.t('missingProviderConfig'))
        }
        databaseReadyRef.current = true
        setDatabaseReady(true)
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setValidationError(getErrorMessage(error))
      }
    }

    void initialize()
    return () => {
      cancelled = true
      activeAgent.current?.abort()
      if (streamingFrame.current !== undefined) cancelAnimationFrame(streamingFrame.current)
    }
  }, [])

  useEffect(() => {
    let previousState = AppState.currentState

    const persistCheckpoint = async () => {
      const agent = activeAgent.current
      if (agent) {
        agent.abort()
        await agent.waitForIdle()
      }

      const current = latestState.current
      if (!current.activeTopicId) return
      const database = getDatabase()
      const messages = agent ? getAgentMessages(agent) : current.conversationMessages
      saveConversationMessages(messages, current.activeTopicId, database)
      saveAppCheckpoint(
        {
          activeTopicId: current.activeTopicId,
          attachments: current.pendingAttachments,
          prompt: current.prompt,
          screen: current.screen
        },
        database
      )
    }

    const restoreCheckpoint = () => {
      const database = getDatabase()
      const checkpoint = loadAppCheckpoint(database)
      if (!checkpoint) return

      const storedTopics = listTopics(database)
      const fallbackTopic = storedTopics[0] ?? createTopic(database)
      const restoredTopic = storedTopics.find((topic) => topic.id === checkpoint.activeTopicId) ?? fallbackTopic
      setTopics(storedTopics.length > 0 ? storedTopics : [fallbackTopic])
      setActiveTopicId(restoredTopic.id)
      setConversationMessages(loadConversationMessages(restoredTopic.id, database))
      setPendingAttachments(checkpoint.attachments)
      setPrompt(checkpoint.prompt)
      setScreen(checkpoint.screen)
      clearStreamingAnswer()
    }

    const reportLifecycleError = (error: unknown) => {
      setStatus('error')
      setValidationError(getErrorMessage(error))
    }

    const queueCheckpoint = () => {
      const persist = () => persistCheckpoint().catch(reportLifecycleError)
      checkpointTask.current = checkpointTask.current.then(persist, persist)
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!databaseReadyRef.current) {
        previousState = nextState
        return
      }

      if (nextState !== 'active' && previousState === 'active') {
        queueCheckpoint()
      } else if (nextState === 'active' && previousState !== 'active') {
        void checkpointTask.current.then(restoreCheckpoint).catch(reportLifecycleError)
      }
      previousState = nextState
    })

    return () => subscription.remove()
  }, [])

  const selectTopic = (topicId: string) => {
    try {
      const database = getDatabase()
      setActiveTopicId(topicId)
      setConversationMessages(loadConversationMessages(topicId, database))
      setEvents([])
      clearStreamingAnswer()
      setStatus('idle')
      setValidationError('')
    } catch (error) {
      setStatus('error')
      setValidationError(getErrorMessage(error))
    }
  }

  const addTopic = () => {
    try {
      const database = getDatabase()
      const topic = createTopic(database)
      setTopics(listTopics(database))
      selectTopic(topic.id)
    } catch (error) {
      setStatus('error')
      setValidationError(getErrorMessage(error))
    }
  }

  const updateTopicName = (topicId: string, name: string) => {
    try {
      const database = getDatabase()
      renameTopic(topicId, name, database)
      setTopics(listTopics(database))
    } catch (error) {
      setStatus('error')
      setValidationError(getErrorMessage(error))
    }
  }

  const confirmTopicDeletion = (topicId: string) => {
    Alert.alert(i18n.t('deleteTopicTitle'), i18n.t('deleteTopicMessage'), [
      { style: 'cancel', text: i18n.t('cancel') },
      {
        style: 'destructive',
        text: i18n.t('deleteTopic'),
        onPress: () => {
          try {
            const database = getDatabase()
            deleteTopic(topicId, database)
            const remainingTopics = listTopics(database)
            if (topicId !== activeTopicId) {
              setTopics(remainingTopics)
              return
            }

            const nextTopic = remainingTopics[0] ?? createTopic(database)
            setTopics(remainingTopics.length > 0 ? remainingTopics : [nextTopic])
            setActiveTopicId(nextTopic.id)
            setConversationMessages(loadConversationMessages(nextTopic.id, database))
            setEvents([])
            clearStreamingAnswer()
            setStatus('idle')
            setValidationError('')
          } catch (error) {
            setStatus('error')
            setValidationError(getErrorMessage(error))
          }
        }
      }
    ])
  }

  const saveProviderSettings = async () => {
    if (![baseUrl, apiKey, modelId].every((value) => value.trim())) {
      setProviderFeedback(i18n.t('missingProviderConfig'))
      return
    }

    try {
      await saveProvider(
        {
          id: DEFAULT_PROVIDER_ID,
          name: 'OpenAI Compatible',
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          modelId: modelId.trim()
        },
        getDatabase(),
        providerSecretStore
      )
      setApiKey(apiKey.trim())
      setBaseUrl(baseUrl.trim())
      setModelId(modelId.trim())
      setProviderFeedback(i18n.t('providerSaved'))
      setValidationError('')
    } catch (error) {
      setProviderFeedback(getErrorMessage(error))
    }
  }

  const selectImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        setValidationError(i18n.t('photoPermissionDenied'))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 0.85,
        selectionLimit: 4
      })
      if (result.canceled) return

      const selected = result.assets.map<MobileImageAttachment>((asset, index) => ({
        fileName: asset.fileName ?? `image-${Date.now()}-${index + 1}.jpg`,
        height: asset.height,
        id: `attachment-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'image',
        mimeType: asset.mimeType ?? 'image/jpeg',
        uri: asset.uri,
        width: asset.width
      }))
      setPendingAttachments((current) => [...current, ...selected].slice(0, 4))
      setValidationError('')
    } catch (error) {
      setValidationError(getErrorMessage(error))
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
    const submittedPrompt = prompt.trim()
    const submittedAttachments = pendingAttachments
    clearStreamingAnswer()
    setEvents([])
    setStatus('running')
    setValidationError('')

    let agent: Agent | undefined
    let unsubscribeEvents: (() => void) | undefined
    let unsubscribePersistence: (() => void) | undefined

    try {
      const currentAgent = createOpenAiCompatibleAgent({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        messages: conversationMessages,
        modelId: modelId.trim()
      })
      agent = currentAgent
      activeAgent.current = currentAgent
      unsubscribeEvents = subscribeToRuntimeEvents(currentAgent, (event) => {
        if (event.type.startsWith('MCP_TOOL_')) setEvents((current) => [...current, event])
        if (event.type === 'TEXT_DELTA') queueStreamingAnswer(event.delta)
        if (event.type === 'TEXT_END') queueStreamingAnswer(event.text, true)
        if (event.type === 'RUN_STATUS') {
          setStatus(event.status)
          if (event.status === 'aborted') setValidationError(i18n.t('requestStopped'))
          else if (event.error) setValidationError(getErrorMessage(event.error))
        }
      })
      unsubscribePersistence = currentAgent.subscribe((event) => {
        if (event.type !== 'message_end') return
        const messages = getAgentMessages(currentAgent)
        const database = getDatabase()
        saveConversationMessages(messages, topicId, database)
        setConversationMessages(messages)
        setTopics(listTopics(database))
        if (event.message.role === 'assistant') clearStreamingAnswer()
      })

      const userMessage: MobileAgentMessage = {
        role: 'user',
        content: submittedPrompt,
        timestamp: Date.now(),
        ...(submittedAttachments.length > 0 ? { attachments: submittedAttachments } : {})
      }
      const promptTask = currentAgent.prompt(userMessage)
      setPrompt('')
      setPendingAttachments([])
      await promptTask
    } catch (error) {
      if (agent?.signal?.aborted) {
        setStatus('aborted')
        setValidationError(i18n.t('requestStopped'))
      } else {
        setStatus('error')
        setValidationError(getErrorMessage(error))
      }
    } finally {
      unsubscribePersistence?.()
      unsubscribeEvents?.()
      if (agent) {
        try {
          const messages = getAgentMessages(agent)
          const database = getDatabase()
          saveConversationMessages(messages, topicId, database)
          setConversationMessages(messages)
          setTopics(listTopics(database))
          clearStreamingAnswer()
        } catch (error) {
          setStatus('error')
          setValidationError(getErrorMessage(error))
        }
      }
      if (activeAgent.current === agent) activeAgent.current = undefined
    }
  }

  const stop = () => {
    activeAgent.current?.abort()
    setValidationError(i18n.t('requestStopped'))
  }

  const running = status === 'running' || status === 'waiting-for-approval'
  const activeTopic = topics.find((topic) => topic.id === activeTopicId)
  const navigationHeader = (
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
          <Text style={[styles.tabText, screen === 'settings' && styles.activeTabText]}>{i18n.t('settingsTab')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      style={styles.screen}>
      <StatusBar style="dark" />
      {screen === 'settings' ? (
        <ScrollView contentContainerStyle={styles.settingsContent} keyboardShouldPersistTaps="handled">
          {navigationHeader}
          <ProviderSettings
            apiKey={apiKey}
            baseUrl={baseUrl}
            feedback={providerFeedback}
            modelId={modelId}
            onApiKeyChange={setApiKey}
            onBaseUrlChange={setBaseUrl}
            onModelIdChange={setModelId}
            onSave={() => void saveProviderSettings()}
          />
        </ScrollView>
      ) : (
        <ConversationMessageList
          footer={
            <>
              <View style={styles.card}>
                <Text style={styles.label}>{i18n.t('prompt')}</Text>
                <TextInput
                  editable={!running}
                  multiline
                  onChangeText={setPrompt}
                  placeholder={i18n.t('promptPlaceholder')}
                  style={[styles.input, styles.prompt]}
                  textAlignVertical="top"
                  value={prompt}
                />
                {pendingAttachments.length > 0 ? (
                  <ScrollView horizontal contentContainerStyle={styles.attachmentPreviewList}>
                    {pendingAttachments.map((attachment) => (
                      <View key={attachment.id} style={styles.attachmentPreview}>
                        <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
                        <TouchableOpacity
                          accessibilityLabel={i18n.t('removeAttachment', { name: attachment.fileName })}
                          onPress={() =>
                            setPendingAttachments((current) => current.filter(({ id }) => id !== attachment.id))
                          }
                          style={styles.removeAttachment}>
                          <Text style={styles.removeAttachmentText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
                {validationError ? <Text style={styles.error}>{validationError}</Text> : null}
                <View style={styles.actions}>
                  <Button disabled={running} onPress={() => void selectImages()} title={i18n.t('addImage')} />
                  {running ? (
                    <Button color="#b42318" onPress={stop} title={i18n.t('stop')} />
                  ) : (
                    <Button disabled={!databaseReady} onPress={() => void submit()} title={i18n.t('send')} />
                  )}
                </View>
                <View style={styles.status}>
                  {running ? <ActivityIndicator size="small" /> : null}
                  <Text style={styles.statusText}>
                    {!databaseReady
                      ? i18n.t('initializing')
                      : running
                        ? i18n.t('running')
                        : i18n.t('status', { status })}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{i18n.t('toolEvents')}</Text>
                <RuntimeEventLog emptyText={i18n.t('noToolEvents')} events={events} />
              </View>
            </>
          }
          header={
            <>
              {navigationHeader}
              <View style={styles.card}>
                <TopicSwitcher
                  activeTopicId={activeTopicId}
                  disabled={!databaseReady || running}
                  onCreate={addTopic}
                  onDelete={confirmTopicDeletion}
                  onRename={updateTopicName}
                  onSelect={selectTopic}
                  topics={topics}
                />
              </View>
              <Text style={styles.sectionTitle}>{activeTopic?.name || i18n.t('untitledTopic')}</Text>
            </>
          }
          messages={conversationMessages}
          streamingText={streamingAnswer}
        />
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  activeTab: { backgroundColor: '#175cd3' },
  activeTabText: { color: '#ffffff' },
  attachmentImage: { height: 88, width: 112 },
  attachmentPreview: { borderRadius: 10, overflow: 'hidden' },
  attachmentPreviewList: { gap: 10 },
  card: { backgroundColor: '#ffffff', borderColor: '#e4e7ec', borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 },
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
  removeAttachment: {
    alignItems: 'center',
    backgroundColor: '#101828cc',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 22
  },
  removeAttachmentText: { color: '#ffffff', fontSize: 18, lineHeight: 20 },
  screen: { backgroundColor: '#f9fafb', flex: 1 },
  sectionTitle: { color: '#101828', fontSize: 17, fontWeight: '600' },
  settingsContent: { gap: 16, padding: 20, paddingBottom: 48, paddingTop: 64 },
  status: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  statusText: { color: '#475467', fontSize: 13 },
  subtitle: { color: '#667085', lineHeight: 20 },
  tab: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 9 },
  tabText: { color: '#475467', fontWeight: '600' },
  tabs: { backgroundColor: '#eaecf0', borderRadius: 10, flexDirection: 'row', padding: 3 },
  title: { color: '#101828', fontSize: 26, fontWeight: '700' }
})
