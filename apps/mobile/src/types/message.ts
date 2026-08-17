import type { AgentMessage } from '@earendil-works/pi-agent-core'

export type MessageDeliveryStatus = 'error' | 'pending' | 'sent'

export interface MobileImageAttachment {
  fileName: string
  height?: number
  id: string
  kind: 'image'
  mimeType: string
  uri: string
  width?: number
}

export type MobileUserMessage = Extract<AgentMessage, { role: 'user' }> & {
  attachments?: MobileImageAttachment[]
  deliveryStatus?: MessageDeliveryStatus
}

export type MobileAgentMessage = Exclude<AgentMessage, { role: 'user' }> | MobileUserMessage

export function getMessageAttachments(message: AgentMessage): MobileImageAttachment[] {
  if (message.role !== 'user') return []
  const attachments = (message as MobileUserMessage).attachments
  return Array.isArray(attachments) ? attachments : []
}

export function getRetryableUserMessage(messages: MobileAgentMessage[]): MobileUserMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user') continue
    return message.deliveryStatus === 'pending' || message.deliveryStatus === 'error' ? message : undefined
  }
  return undefined
}

export function setMessageDeliveryStatus(
  messages: MobileAgentMessage[],
  timestamp: number,
  deliveryStatus: MessageDeliveryStatus
): MobileAgentMessage[] {
  return messages.map((message) =>
    message.role === 'user' && message.timestamp === timestamp ? { ...message, deliveryStatus } : message
  )
}

export function resolveMessageDeliveryStatus(
  messages: MobileAgentMessage[],
  timestamp: number,
  online: boolean
): MessageDeliveryStatus {
  if (!online) return 'pending'

  const messageIndex = messages.findIndex((message) => message.role === 'user' && message.timestamp === timestamp)
  const response = messages.slice(messageIndex + 1).findLast((message) => message.role === 'assistant')
  return !response || response.stopReason === 'error' || response.stopReason === 'aborted' ? 'error' : 'sent'
}
