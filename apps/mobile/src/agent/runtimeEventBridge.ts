import type { RuntimeEvent } from '@cherrystudio/ai-runtime-contracts'
import type { Agent, AgentEvent } from '@earendil-works/pi-agent-core'

export type RuntimeEventListener = (event: RuntimeEvent) => void
type RuntimeEventPayload = RuntimeEvent extends infer Event
  ? Event extends RuntimeEvent
    ? Omit<Event, 'runId' | 'timestamp'>
    : never
  : never

function getTerminalStatus(agent: Agent): Extract<RuntimeEvent, { type: 'RUN_STATUS' }>['status'] {
  const lastMessage = agent.state.messages.at(-1)
  if (lastMessage?.role === 'assistant' && lastMessage.stopReason === 'aborted') return 'aborted'
  if (lastMessage?.role === 'assistant' && lastMessage.stopReason === 'error') return 'error'
  if (agent.state.errorMessage) return 'error'
  return 'completed'
}

export function subscribeToRuntimeEvents(agent: Agent, listener: RuntimeEventListener): () => void {
  const runId = `run-${Date.now()}`
  let messageSequence = 0
  let messageId = `${runId}-message-0`

  const emit = (event: RuntimeEventPayload) => {
    listener({ ...event, runId, timestamp: Date.now() } as RuntimeEvent)
  }

  return agent.subscribe((event: AgentEvent) => {
    switch (event.type) {
      case 'agent_start':
        emit({ type: 'RUN_STATUS', status: 'running' })
        break
      case 'message_start':
        if (event.message.role === 'assistant') {
          messageSequence += 1
          messageId = `${runId}-message-${messageSequence}`
        }
        break
      case 'message_update': {
        const update = event.assistantMessageEvent
        if (update.type === 'text_start') emit({ type: 'TEXT_START', messageId })
        if (update.type === 'text_delta') emit({ type: 'TEXT_DELTA', messageId, delta: update.delta })
        if (update.type === 'text_end') emit({ type: 'TEXT_END', messageId, text: update.content })
        if (update.type === 'error') {
          emit({
            type: 'RUN_STATUS',
            status: update.reason,
            ...(update.error.errorMessage ? { error: update.error.errorMessage } : {})
          })
        }
        break
      }
      case 'tool_execution_start':
        emit({
          type: 'MCP_TOOL_START',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          input: event.args
        })
        break
      case 'tool_execution_update':
        emit({ type: 'MCP_TOOL_UPDATE', toolCallId: event.toolCallId, update: event.partialResult })
        break
      case 'tool_execution_end':
        emit({
          type: 'MCP_TOOL_END',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          output: event.result,
          ...(event.isError ? { error: 'Tool execution failed' } : {})
        })
        break
      case 'agent_end': {
        const status = getTerminalStatus(agent)
        emit({
          type: 'RUN_STATUS',
          status,
          ...(agent.state.errorMessage ? { error: agent.state.errorMessage } : {})
        })
        break
      }
    }
  })
}
