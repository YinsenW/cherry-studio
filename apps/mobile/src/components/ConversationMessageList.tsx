import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

import i18n from '../i18n'

interface ConversationMessageListProps {
  messages: AgentMessage[]
  streamingText?: string
}

interface ToolCardProps {
  isError?: boolean
  name: string
  parameters?: unknown
  result?: string
}

function getRoleLabel(message: AgentMessage): string {
  switch (message.role) {
    case 'user':
      return i18n.t('userRole')
    case 'assistant':
      return i18n.t('assistantRole')
    case 'toolResult':
      return i18n.t('toolRole', { name: message.toolName })
    case 'bashExecution':
      return i18n.t('bashRole')
    case 'custom':
      return i18n.t('customRole', { name: message.customType })
    case 'branchSummary':
      return i18n.t('branchSummaryRole')
    case 'compactionSummary':
      return i18n.t('compactionSummaryRole')
  }
}

function summarize(value: unknown): string {
  let text: string
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    text = String(value)
  }
  return text.length > 1_200 ? `${text.slice(0, 1_200)}…` : text
}

function getToolResultText(message: Extract<AgentMessage, { role: 'toolResult' }>): string {
  return message.content
    .flatMap((part) => {
      if (part.type === 'text') return [part.text]
      if (part.type === 'image') return [i18n.t('imageContent')]
      return []
    })
    .join('\n')
}

function ToolCard({ isError, name, parameters, result }: ToolCardProps) {
  return (
    <View style={[styles.toolCard, isError && styles.toolCardError]}>
      <Text style={styles.toolName}>{name}</Text>
      {parameters !== undefined ? (
        <View style={styles.toolSection}>
          <Text style={styles.toolLabel}>{i18n.t('toolParameters')}</Text>
          <Text selectable style={styles.toolValue}>
            {summarize(parameters)}
          </Text>
        </View>
      ) : null}
      {result !== undefined ? (
        <View style={styles.toolSection}>
          <Text style={styles.toolLabel}>{isError ? i18n.t('toolError') : i18n.t('toolResult')}</Text>
          <Text selectable style={[styles.toolValue, isError && styles.toolErrorText]}>
            {result || i18n.t('emptyMessage')}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function MarkdownContent({ text, user = false }: { text: string; user?: boolean }) {
  if (!text) return <Text style={[styles.content, user && styles.userText]}>{i18n.t('emptyMessage')}</Text>
  return <Markdown style={user ? userMarkdownStyles : markdownStyles}>{text}</Markdown>
}

function MessageContent({ message }: { message: AgentMessage }) {
  if (message.role === 'toolResult') {
    return <ToolCard isError={message.isError} name={message.toolName} result={summarize(getToolResultText(message))} />
  }
  if (message.role === 'bashExecution') {
    return <MarkdownContent text={`\`\`\`sh\n${message.command}\n\`\`\`\n\n\`\`\`\n${message.output}\n\`\`\``} />
  }
  if (message.role === 'branchSummary' || message.role === 'compactionSummary') {
    return <MarkdownContent text={message.summary} />
  }
  if (typeof message.content === 'string') {
    return <MarkdownContent text={message.content} user={message.role === 'user'} />
  }

  return (
    <View style={styles.contentParts}>
      {message.content.map((part, index) => {
        if (part.type === 'text') {
          return <MarkdownContent key={`${part.type}-${index}`} text={part.text} user={message.role === 'user'} />
        }
        if (part.type === 'toolCall') {
          return <ToolCard key={`${part.id}-${index}`} name={part.name} parameters={part.arguments} />
        }
        if (part.type === 'image') {
          return (
            <Text key={`${part.type}-${index}`} style={[styles.content, message.role === 'user' && styles.userText]}>
              {i18n.t('imageContent')}
            </Text>
          )
        }
        return null
      })}
    </View>
  )
}

export function ConversationMessageList({ messages, streamingText = '' }: ConversationMessageListProps) {
  if (messages.length === 0 && !streamingText) return <Text style={styles.empty}>{i18n.t('noMessages')}</Text>

  return (
    <View style={styles.list}>
      {messages.map((message, index) => {
        const userMessage = message.role === 'user'
        return (
          <View
            key={`${message.timestamp}-${message.role}-${index}`}
            style={[styles.message, userMessage && styles.user]}>
            <Text style={[styles.role, userMessage && styles.userText]}>{getRoleLabel(message)}</Text>
            <MessageContent message={message} />
          </View>
        )
      })}
      {streamingText ? (
        <View style={[styles.message, styles.streaming]}>
          <View style={styles.streamingHeader}>
            <ActivityIndicator color="#175cd3" size="small" />
            <Text style={styles.streamingRole}>{i18n.t('streamingAnswer')}</Text>
          </View>
          <MarkdownContent text={streamingText} />
        </View>
      ) : null}
    </View>
  )
}

const markdownStyles = StyleSheet.create({
  body: { color: '#344054', fontSize: 14, lineHeight: 21 },
  bullet_list: { marginVertical: 4 },
  code_block: { backgroundColor: '#eaecf0', borderColor: '#d0d5dd', color: '#101828', padding: 10 },
  code_inline: { backgroundColor: '#eaecf0', color: '#101828' },
  fence: { backgroundColor: '#eaecf0', borderColor: '#d0d5dd', color: '#101828', padding: 10 },
  heading1: { color: '#101828', fontSize: 22, marginBottom: 8, marginTop: 4 },
  heading2: { color: '#101828', fontSize: 19, marginBottom: 6, marginTop: 4 },
  heading3: { color: '#101828', fontSize: 16, marginBottom: 4, marginTop: 2 },
  link: { color: '#175cd3' },
  paragraph: { marginBottom: 6, marginTop: 0 }
})

const userMarkdownStyles = StyleSheet.create({
  body: { color: '#ffffff', fontSize: 14, lineHeight: 21 },
  code_block: { backgroundColor: '#1849a9', borderColor: '#53b1fd', color: '#ffffff', padding: 10 },
  code_inline: { backgroundColor: '#1849a9', color: '#ffffff' },
  fence: { backgroundColor: '#1849a9', borderColor: '#53b1fd', color: '#ffffff', padding: 10 },
  heading1: { color: '#ffffff', fontSize: 22, marginBottom: 8, marginTop: 4 },
  heading2: { color: '#ffffff', fontSize: 19, marginBottom: 6, marginTop: 4 },
  heading3: { color: '#ffffff', fontSize: 16, marginBottom: 4, marginTop: 2 },
  link: { color: '#b2ddff' },
  paragraph: { marginBottom: 6, marginTop: 0 }
})

const styles = StyleSheet.create({
  content: { color: '#344054', lineHeight: 21 },
  contentParts: { gap: 8 },
  empty: { color: '#667085', lineHeight: 20 },
  list: { gap: 10 },
  message: {
    alignSelf: 'flex-start',
    backgroundColor: '#f2f4f7',
    borderRadius: 12,
    gap: 4,
    maxWidth: '92%',
    padding: 12
  },
  role: { color: '#475467', fontSize: 12, fontWeight: '600' },
  streaming: { backgroundColor: '#eff8ff' },
  streamingHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  streamingRole: { color: '#175cd3', fontSize: 12, fontWeight: '600' },
  toolCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  toolCardError: { borderColor: '#fda29b' },
  toolErrorText: { color: '#b42318' },
  toolLabel: { color: '#667085', fontSize: 11, fontWeight: '600' },
  toolName: { color: '#101828', fontSize: 14, fontWeight: '700' },
  toolSection: { gap: 3 },
  toolValue: { color: '#344054', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  user: { alignSelf: 'flex-end', backgroundColor: '#175cd3' },
  userText: { color: '#ffffff' }
})
