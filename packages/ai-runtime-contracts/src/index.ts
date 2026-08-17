export type AgentStatus = 'idle' | 'running' | 'waiting-for-approval' | 'completed' | 'aborted' | 'error'

export interface AgentRuntimeState {
  status: AgentStatus
  error?: string
}

interface RuntimeEventBase {
  runId: string
  timestamp: number
}

export type RuntimeEvent =
  | (RuntimeEventBase & {
      type: 'TEXT_START'
      messageId: string
    })
  | (RuntimeEventBase & {
      type: 'TEXT_DELTA'
      messageId: string
      delta: string
    })
  | (RuntimeEventBase & {
      type: 'TEXT_END'
      messageId: string
      text: string
    })
  | (RuntimeEventBase & {
      type: 'MCP_TOOL_START'
      toolCallId: string
      toolName: string
      input: unknown
    })
  | (RuntimeEventBase & {
      type: 'MCP_TOOL_UPDATE'
      toolCallId: string
      update: unknown
    })
  | (RuntimeEventBase & {
      type: 'MCP_TOOL_END'
      toolCallId: string
      toolName: string
      output?: unknown
      error?: string
    })
  | (RuntimeEventBase & {
      type: 'RUN_STATUS'
      status: AgentStatus
      error?: string
    })
