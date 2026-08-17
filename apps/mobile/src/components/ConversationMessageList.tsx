import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { StyleSheet, Text, View } from 'react-native'

import i18n from '../i18n'

interface ConversationMessageListProps {
  messages: AgentMessage[]
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

function getMessageText(message: AgentMessage): string {
  if (message.role === 'bashExecution') return `${message.command}\n${message.output}`
  if (message.role === 'branchSummary' || message.role === 'compactionSummary') return message.summary
  if (typeof message.content === 'string') return message.content

  const parts: string[] = []
  for (const part of message.content) {
    if (part.type === 'text') parts.push(part.text)
    if (part.type === 'image') parts.push(i18n.t('imageContent'))
    if (part.type === 'toolCall') {
      parts.push(i18n.t('toolCallContent', { name: part.name, input: JSON.stringify(part.arguments) }))
    }
  }
  return parts.join('\n') || i18n.t('emptyMessage')
}

export function ConversationMessageList({ messages }: ConversationMessageListProps) {
  if (messages.length === 0) return <Text style={styles.empty}>{i18n.t('noMessages')}</Text>

  return (
    <View style={styles.list}>
      {messages.map((message, index) => {
        const userMessage = message.role === 'user'
        return (
          <View
            key={`${message.timestamp}-${message.role}-${index}`}
            style={[styles.message, userMessage && styles.user]}>
            <Text style={[styles.role, userMessage && styles.userText]}>{getRoleLabel(message)}</Text>
            <Text selectable style={[styles.content, userMessage && styles.userText]}>
              {getMessageText(message)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { color: '#344054', lineHeight: 21 },
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
  user: { alignSelf: 'flex-end', backgroundColor: '#175cd3' },
  userText: { color: '#ffffff' }
})
