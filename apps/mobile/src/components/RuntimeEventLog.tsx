import type { RuntimeEvent } from '@cherrystudio/ai-runtime-contracts'
import { StyleSheet, Text, View } from 'react-native'

interface RuntimeEventLogProps {
  emptyText: string
  events: RuntimeEvent[]
}

function describeEvent(event: RuntimeEvent): string {
  switch (event.type) {
    case 'MCP_TOOL_START':
      return `START  ${event.toolName}\n${JSON.stringify(event.input, null, 2)}`
    case 'MCP_TOOL_UPDATE':
      return `UPDATE ${event.toolCallId}\n${JSON.stringify(event.update, null, 2)}`
    case 'MCP_TOOL_END':
      return `END    ${event.toolName}\n${event.error ?? JSON.stringify(event.output, null, 2)}`
    default:
      return event.type
  }
}

export function RuntimeEventLog({ emptyText, events }: RuntimeEventLogProps) {
  const toolEvents = events.filter((event) => event.type.startsWith('MCP_TOOL_'))

  if (toolEvents.length === 0) return <Text style={styles.empty}>{emptyText}</Text>

  return (
    <View style={styles.list}>
      {toolEvents.map((event, index) => (
        <View key={`${event.runId}-${event.type}-${index}`} style={styles.event}>
          <Text selectable style={styles.eventText}>
            {describeEvent(event)}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    color: '#667085',
    lineHeight: 20
  },
  event: {
    backgroundColor: '#f2f4f7',
    borderRadius: 10,
    padding: 12
  },
  eventText: {
    color: '#344054',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18
  },
  list: {
    gap: 8
  }
})
