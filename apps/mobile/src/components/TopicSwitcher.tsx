import { useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import type { TopicRecord } from '../db/topic'
import i18n from '../i18n'

interface TopicSwitcherProps {
  activeTopicId: string
  disabled: boolean
  onCreate: () => void
  onDelete: (topicId: string) => void
  onRename: (topicId: string, name: string) => void
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

export function TopicSwitcher({
  activeTopicId,
  disabled,
  onCreate,
  onDelete,
  onRename,
  onSelect,
  topics
}: TopicSwitcherProps) {
  const [managedTopic, setManagedTopic] = useState<TopicRecord>()
  const [draftName, setDraftName] = useState('')

  const openTopicManagement = (topic: TopicRecord) => {
    setManagedTopic(topic)
    setDraftName(topic.name)
  }

  const closeTopicManagement = () => setManagedTopic(undefined)

  const submitRename = () => {
    if (!managedTopic || !draftName.trim()) return
    onRename(managedTopic.id, draftName)
    closeTopicManagement()
  }

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
              accessibilityHint={i18n.t('topicLongPressHint')}
              accessibilityRole="button"
              delayLongPress={350}
              disabled={disabled}
              key={topic.id}
              onLongPress={() => openTopicManagement(topic)}
              onPress={() => {
                if (!active) onSelect(topic.id)
              }}
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
      <Modal
        animationType="fade"
        onRequestClose={closeTopicManagement}
        transparent
        visible={managedTopic !== undefined}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{i18n.t('manageTopic')}</Text>
            <TextInput
              autoFocus
              onChangeText={setDraftName}
              placeholder={i18n.t('topicNamePlaceholder')}
              selectTextOnFocus
              style={styles.input}
              value={draftName}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={closeTopicManagement} style={styles.actionButton}>
                <Text style={styles.actionText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (managedTopic) onDelete(managedTopic.id)
                  closeTopicManagement()
                }}
                style={[styles.actionButton, styles.deleteButton]}>
                <Text style={styles.deleteText}>{i18n.t('deleteTopic')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!draftName.trim()}
                onPress={submitRename}
                style={[styles.actionButton, styles.renameButton, !draftName.trim() && styles.disabled]}>
                <Text style={styles.renameText}>{i18n.t('renameTopic')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  activeText: { color: '#ffffff' },
  activeTime: { color: '#d1e9ff' },
  activeTopic: { backgroundColor: '#175cd3', borderColor: '#175cd3' },
  actionButton: { alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  actionText: { color: '#475467', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  container: { gap: 10 },
  create: { backgroundColor: '#eff8ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  createText: { color: '#175cd3', fontSize: 13, fontWeight: '600' },
  deleteButton: { marginRight: 'auto' },
  deleteText: { color: '#b42318', fontWeight: '600' },
  dialog: { backgroundColor: '#ffffff', borderRadius: 14, gap: 14, padding: 18, width: '88%' },
  dialogTitle: { color: '#101828', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  list: { gap: 8 },
  input: {
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    color: '#101828',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  overlay: { alignItems: 'center', backgroundColor: 'rgba(16, 24, 40, 0.45)', flex: 1, justifyContent: 'center' },
  renameButton: { backgroundColor: '#175cd3' },
  renameText: { color: '#ffffff', fontWeight: '600' },
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
