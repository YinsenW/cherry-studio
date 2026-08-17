import { Directory, File, Paths } from 'expo-file-system'

import type { MobileImageAttachment } from './types/message'

const ATTACHMENT_DIRECTORY = 'attachments'

function getTopicDirectory(topicId: string): Directory {
  return new Directory(Paths.document, ATTACHMENT_DIRECTORY, topicId)
}

function getFileExtension(fileName: string): string {
  const match = /\.[a-z0-9]+$/i.exec(fileName)
  return match?.[0].toLowerCase() ?? ''
}

export interface SelectedImage {
  fileName?: string | null
  height?: number
  mimeType?: string
  uri: string
  width?: number
}

export async function persistImageAttachment(
  image: SelectedImage,
  topicId: string,
  index: number
): Promise<MobileImageAttachment> {
  const id = `attachment-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
  const originalName = image.fileName ?? `image-${Date.now()}-${index + 1}.jpg`
  const directory = getTopicDirectory(topicId)
  directory.create({ idempotent: true, intermediates: true })

  const destination = new File(directory, `${id}${getFileExtension(originalName)}`)
  await new File(image.uri).copy(destination)

  return {
    fileName: originalName,
    height: image.height,
    id,
    kind: 'image',
    mimeType: image.mimeType ?? 'image/jpeg',
    uri: destination.uri,
    width: image.width
  }
}

export async function readAttachmentAsBase64(uri: string): Promise<string> {
  return new File(uri).base64()
}

export function deleteAttachmentFile(uri: string): void {
  const file = new File(uri)
  if (file.exists) file.delete()
}

export function deleteTopicAttachments(topicId: string): void {
  const directory = getTopicDirectory(topicId)
  if (directory.exists) directory.delete()
}
