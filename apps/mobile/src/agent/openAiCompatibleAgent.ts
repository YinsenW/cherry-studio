import { Agent, type AgentMessage, type AgentTool, type StreamFn } from '@earendil-works/pi-agent-core'
import { lazyStream, type Message, type Model, Type } from '@earendil-works/pi-ai'
import { streamSimple as streamOpenAiCompatible } from '@earendil-works/pi-ai/api/openai-completions'

import { getMessageAttachments } from '../types/message'

export interface OpenAiCompatibleConfig {
  apiKey: string
  baseUrl: string
  messages?: AgentMessage[]
  modelId: string
  readImage: (uri: string) => Promise<string>
  supportsImages: boolean
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
    input: config.supportsImages ? ['text', 'image'] : ['text'],
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

export async function convertMessagesForLlm(
  messages: AgentMessage[],
  supportsImages: boolean,
  readImage: (uri: string) => Promise<string>
): Promise<Message[]> {
  const converted: Message[] = []

  for (const message of messages) {
    if (message.role === 'user') {
      const textContent =
        typeof message.content === 'string'
          ? [{ type: 'text' as const, text: message.content }]
          : message.content.filter((part) => part.type === 'text')
      const attachments = supportsImages ? getMessageAttachments(message) : []
      if (attachments.length === 0) {
        converted.push({ role: 'user', content: textContent, timestamp: message.timestamp })
        continue
      }

      const imageContent = await Promise.all(
        attachments.map(async (attachment) => ({
          type: 'image' as const,
          data: await readImage(attachment.uri),
          mimeType: attachment.mimeType
        }))
      )
      converted.push({ role: 'user', content: [...textContent, ...imageContent], timestamp: message.timestamp })
    } else if (message.role === 'assistant' || message.role === 'toolResult') {
      converted.push(message)
    }
  }

  return converted
}

export function createOpenAiCompatibleAgent(config: OpenAiCompatibleConfig): Agent {
  const model = createModel(config)
  const streamFn: StreamFn = (requestedModel, context, options) =>
    lazyStream(requestedModel, async () =>
      streamOpenAiCompatible(requestedModel as Model<'openai-completions'>, context, {
        ...options,
        apiKey: config.apiKey,
        fetch: globalThis.fetch
      })
    )

  return new Agent({
    convertToLlm: (messages) => convertMessagesForLlm(messages, config.supportsImages, config.readImage),
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
