import type { AgentMessage } from '@earendil-works/pi-agent-core'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const assistantTable = sqliteTable(
  'assistant',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    prompt: text('prompt').notNull().default(''),
    emoji: text('emoji').notNull(),
    description: text('description').notNull().default(''),
    modelId: text('model_id'),
    settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    orderKey: text('order_key').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at')
  },
  (table) => [
    index('assistant_created_at_idx').on(table.createdAt),
    index('assistant_order_key_idx').on(table.orderKey)
  ]
)

export const topicTable = sqliteTable(
  'topic',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().default(''),
    isNameManuallyEdited: integer('is_name_manually_edited', { mode: 'boolean' }).notNull().default(false),
    assistantId: text('assistant_id').references(() => assistantTable.id, { onDelete: 'set null' }),
    activeNodeId: text('active_node_id'),
    traceId: text('trace_id'),
    orderKey: text('order_key').notNull(),
    lastActivityAt: integer('last_activity_at').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at')
  },
  (table) => [
    index('topic_last_activity_at_idx').on(table.lastActivityAt),
    index('topic_updated_at_idx').on(table.updatedAt),
    index('topic_order_key_idx').on(table.orderKey),
    index('topic_assistant_id_idx').on(table.assistantId)
  ]
)

export const messageTable = sqliteTable(
  'message',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id'),
    topicId: text('topic_id')
      .notNull()
      .references(() => topicTable.id, { onDelete: 'cascade' }),
    role: text('role').$type<AgentMessage['role']>().notNull(),
    data: text('data', { mode: 'json' }).$type<AgentMessage>().notNull(),
    status: text('status').$type<'success' | 'error'>().notNull(),
    sequence: integer('sequence').notNull(),
    modelId: text('model_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at')
  },
  (table) => [
    index('message_topic_created_idx').on(table.topicId, table.createdAt),
    uniqueIndex('message_topic_sequence_uniq').on(table.topicId, table.sequence)
  ]
)

export const providerTable = sqliteTable(
  'provider',
  {
    id: text('provider_id').primaryKey(),
    name: text('name').notNull(),
    baseUrl: text('base_url').notNull(),
    apiKey: text('api_key').notNull(),
    modelId: text('model_id').notNull(),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
    orderKey: text('order_key').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (table) => [index('provider_enabled_idx').on(table.isEnabled), index('provider_order_key_idx').on(table.orderKey)]
)

export const schema = {
  assistantTable,
  messageTable,
  providerTable,
  topicTable
}

export type ProviderRecord = typeof providerTable.$inferSelect
