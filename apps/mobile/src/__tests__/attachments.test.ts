import { beforeEach, describe, expect, it, vi } from 'vitest'

const { directories, files, MockDirectory, MockFile } = vi.hoisted(() => {
  const storedFiles = new Map<string, string>()
  const storedDirectories = new Set<string>()

  class FileSystemDirectory {
    uri: string

    constructor(...parts: ({ uri: string } | string)[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/')
    }

    create() {
      storedDirectories.add(this.uri)
    }

    delete() {
      storedDirectories.delete(this.uri)
      for (const uri of storedFiles.keys()) {
        if (uri.startsWith(`${this.uri}/`)) storedFiles.delete(uri)
      }
    }

    get exists() {
      return storedDirectories.has(this.uri)
    }
  }

  class FileSystemFile {
    uri: string

    constructor(...parts: ({ uri: string } | string)[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/')
    }

    async base64() {
      return storedFiles.get(this.uri) ?? ''
    }

    async copy(destination: FileSystemFile) {
      storedFiles.set(destination.uri, storedFiles.get(this.uri) ?? '')
    }

    delete() {
      storedFiles.delete(this.uri)
    }

    get exists() {
      return storedFiles.has(this.uri)
    }
  }

  return {
    directories: storedDirectories,
    files: storedFiles,
    MockDirectory: FileSystemDirectory,
    MockFile: FileSystemFile
  }
})

vi.mock('expo-file-system', () => ({
  Directory: MockDirectory,
  File: MockFile,
  Paths: { document: { uri: 'file:///documents' } }
}))

import {
  deleteAttachmentFile,
  deleteTopicAttachments,
  persistImageAttachment,
  readAttachmentAsBase64
} from '../attachments'

describe('mobile attachment storage', () => {
  beforeEach(() => {
    files.clear()
    directories.clear()
  })

  it('copies a picker image into the topic document directory and reads it for upload', async () => {
    files.set('file:///picker/photo.jpg', 'encoded-image')

    const attachment = await persistImageAttachment(
      { fileName: 'photo.JPG', mimeType: 'image/jpeg', uri: 'file:///picker/photo.jpg' },
      'topic-1',
      0
    )

    expect(attachment.uri).toMatch(/^file:\/\/\/documents\/attachments\/topic-1\/attachment-.+\.jpg$/)
    await expect(readAttachmentAsBase64(attachment.uri)).resolves.toBe('encoded-image')
  })

  it('deletes a removed draft file and all files owned by a deleted topic', async () => {
    files.set('file:///picker/one.jpg', 'one')
    files.set('file:///picker/two.jpg', 'two')
    files.set('file:///picker/other.jpg', 'other')
    const first = await persistImageAttachment({ uri: 'file:///picker/one.jpg' }, 'topic-1', 0)
    const second = await persistImageAttachment({ uri: 'file:///picker/two.jpg' }, 'topic-1', 1)
    const other = await persistImageAttachment({ uri: 'file:///picker/other.jpg' }, 'topic-2', 0)

    deleteAttachmentFile(first.uri)
    expect(files.has(first.uri)).toBe(false)
    expect(files.has(second.uri)).toBe(true)

    deleteTopicAttachments('topic-1')
    expect(files.has(second.uri)).toBe(false)
    expect(files.has(other.uri)).toBe(true)
  })
})
