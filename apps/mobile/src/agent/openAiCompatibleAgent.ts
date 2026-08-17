import { Agent, type AgentMessage, type AgentTool, type StreamFn } from '@earendil-works/pi-agent-core'
import { type Model, Type } from '@earendil-works/pi-ai'
import { streamSimple as streamOpenAiCompatible } from '@earendil-works/pi-ai/api/openai-completions'

export interface OpenAiCompatibleConfig {
  apiKey: string
  baseUrl: string
  messages?: AgentMessage[]
  modelId: string
}

const CurrentTimeParameters = Type.Object({})

const currentTimeTool: AgentTool<typeof CurrentTimeParameters, { iso: string }> = {
  name: 'get_current_time',
  label: 'Get current time',
  description: 'Return the current time in ISO 8601 format.',
  parameters: CurrentTimeParameters,
  execute: async () => {
    const iso = new Date().toISOString()
    return {
      content: [{ type: 'text', text: iso }],
      details: { iso }
    }
  }
}

function createModel(config: OpenAiCompatibleConfig): Model<'openai-completions'> {
  return {
    id: config.modelId,
    name: config.modelId,
    api: 'openai-completions',
    provider: 'openai-compatible',
    baseUrl: config.baseUrl.replace(/\/+$/, ''),
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 4_096,
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      supportsUsageInStreaming: false,
      maxTokensField: 'max_tokens',
      supportsStrictMode: false
    }
  }
}

export function createOpenAiCompatibleAgent(config: OpenAiCompatibleConfig): Agent {
  const model = createModel(config)
  const streamFn: StreamFn = (requestedModel, context, options) =>
    streamOpenAiCompatible(requestedModel as Model<'openai-completions'>, context, {
      ...options,
      apiKey: config.apiKey,
      fetch: globalThis.fetch
    })

  return new Agent({
    initialState: {
      model,
      messages: config.messages ?? [],
      systemPrompt:
        'You are a helpful mobile assistant. Use available tools when the user asks for information they provide.',
      tools: [currentTimeTool]
    },
    streamFn
  })
}
