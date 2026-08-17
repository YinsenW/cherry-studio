import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import type { TopicRecord } from '../db/topic'
import i18n from '../i18n'

interface TopicSwitcherProps {
  activeTopicId: string
  disabled: boolean
  onCreate: () => void
  onSelect: (topicId: string) => void
  topics: TopicRecord[]
}

function formatLastActivity(timestamp: number): string {
  return new Date(timestamp).toLocaleString(i18n.language, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function TopicSwitcher({ activeTopicId, disabled, onCreate, onSelect, topics }: TopicSwitcherProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('topics')}</Text>
        <TouchableOpacity disabled={disabled} onPress={onCreate} style={[styles.create, disabled && styles.disabled]}>
          <Text style={styles.createText}>{i18n.t('newTopic')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {topics.map((topic) => {
          const active = topic.id === activeTopicId
          return (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={disabled || active}
              key={topic.id}
              onPress={() => onSelect(topic.id)}
              style={[styles.topic, active && styles.activeTopic]}>
              <Text numberOfLines={1} style={[styles.topicName, active && styles.activeText]}>
                {topic.name || i18n.t('untitledTopic')}
              </Text>
              <Text style={[styles.topicTime, active && styles.activeTime]}>
                {formatLastActivity(topic.lastActivityAt)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  activeText: { color: '#ffffff' },
  activeTime: { color: '#d1e9ff' },
  activeTopic: { backgroundColor: '#175cd3', borderColor: '#175cd3' },
  container: { gap: 10 },
  create: { backgroundColor: '#eff8ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  createText: { color: '#175cd3', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  list: { gap: 8 },
  title: { color: '#101828', fontSize: 17, fontWeight: '600' },
  topic: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 150
  },
  topicName: { color: '#101828', fontSize: 14, fontWeight: '600' },
  topicTime: { color: '#667085', fontSize: 11 }
})
