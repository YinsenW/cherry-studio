import type { AgentMessage } from '@earendil-works/pi-agent-core'

export interface MobileImageAttachment {
  fileName: string
  height?: number
  id: string
  kind: 'image'
  mimeType: string
  uri: string
  width?: number
}

export type MobileAgentMessage = AgentMessage & {
  attachments?: MobileImageAttachment[]
}

export function getMessageAttachments(message: AgentMessage): MobileImageAttachment[] {
  const attachments = (message as MobileAgentMessage).attachments
  return Array.isArray(attachments) ? attachments : []
}
