export interface Migration {
  statements: string[]
  version: number
}

export const migrations: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS assistant (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        prompt TEXT DEFAULT '' NOT NULL,
        emoji TEXT NOT NULL,
        description TEXT DEFAULT '' NOT NULL,
        model_id TEXT,
        settings TEXT NOT NULL,
        order_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      'CREATE INDEX IF NOT EXISTS assistant_created_at_idx ON assistant (created_at)',
      'CREATE INDEX IF NOT EXISTS assistant_order_key_idx ON assistant (order_key)',
      `CREATE TABLE IF NOT EXISTS topic (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT DEFAULT '' NOT NULL,
        is_name_manually_edited INTEGER DEFAULT 0 NOT NULL,
        assistant_id TEXT REFERENCES assistant(id) ON DELETE SET NULL,
        active_node_id TEXT,
        trace_id TEXT,
        order_key TEXT NOT NULL,
        last_activity_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      'CREATE INDEX IF NOT EXISTS topic_last_activity_at_idx ON topic (last_activity_at)',
      'CREATE INDEX IF NOT EXISTS topic_updated_at_idx ON topic (updated_at)',
      'CREATE INDEX IF NOT EXISTS topic_order_key_idx ON topic (order_key)',
      'CREATE INDEX IF NOT EXISTS topic_assistant_id_idx ON topic (assistant_id)',
      `CREATE TABLE IF NOT EXISTS message (
        id TEXT PRIMARY KEY NOT NULL,
        parent_id TEXT,
        topic_id TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'error')),
        sequence INTEGER NOT NULL,
        model_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      'CREATE INDEX IF NOT EXISTS message_topic_created_idx ON message (topic_id, created_at)',
      'CREATE UNIQUE INDEX IF NOT EXISTS message_topic_sequence_uniq ON message (topic_id, sequence)',
      `CREATE TABLE IF NOT EXISTS provider (
        provider_id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model_id TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 1 NOT NULL,
        order_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS provider_enabled_idx ON provider (is_enabled)',
      'CREATE INDEX IF NOT EXISTS provider_order_key_idx ON provider (order_key)'
    ]
  }
]
