export interface Migration {
  statements: string[]
  version: number
}

export interface MigrationDatabase {
  execSync(source: string): void
  getAllSync<T>(source: string): T[]
  getFirstSync<T>(source: string): T | null
  withTransactionSync(task: () => void): void
}

export interface MigrationSecretStore {
  setItemAsync(key: string, value: string): Promise<void>
}

interface LegacyProviderSecret {
  apiKey: string
  apiKeyRef: string
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
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE provider_secure (
        provider_id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key_ref TEXT NOT NULL,
        model_id TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 1 NOT NULL,
        order_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `INSERT INTO provider_secure (
        provider_id, name, base_url, api_key_ref, model_id,
        is_enabled, order_key, created_at, updated_at
      )
      SELECT
        provider_id, name, base_url, 'provider.' || lower(hex(provider_id)), model_id,
        is_enabled, order_key, created_at, updated_at
      FROM provider`,
      'DROP TABLE provider',
      'ALTER TABLE provider_secure RENAME TO provider',
      'CREATE INDEX provider_enabled_idx ON provider (is_enabled)',
      'CREATE INDEX provider_order_key_idx ON provider (order_key)'
    ]
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE app_checkpoint (
        id TEXT PRIMARY KEY NOT NULL,
        active_topic_id TEXT NOT NULL,
        attachments TEXT NOT NULL,
        prompt TEXT NOT NULL,
        screen TEXT NOT NULL CHECK(screen IN ('chat', 'settings')),
        updated_at INTEGER NOT NULL
      )`
    ]
  }
]

async function migrateLegacyProviderSecrets(database: MigrationDatabase, secretStore: MigrationSecretStore) {
  const secrets = database.getAllSync<LegacyProviderSecret>(
    `SELECT api_key AS apiKey, 'provider.' || lower(hex(provider_id)) AS apiKeyRef FROM provider`
  )

  await Promise.all(
    secrets
      .filter(({ apiKey }) => apiKey.length > 0)
      .map(({ apiKey, apiKeyRef }) => secretStore.setItemAsync(apiKeyRef, apiKey))
  )
}

export async function applyMigrations(database: MigrationDatabase, secretStore: MigrationSecretStore): Promise<void> {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version')
  const currentVersion = row?.user_version ?? 0
  const latestVersion = migrations.at(-1)?.version ?? 0

  if (currentVersion > latestVersion) {
    throw new Error(`Database version ${currentVersion} is newer than supported version ${latestVersion}`)
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue
    if (migration.version === 2) await migrateLegacyProviderSecrets(database, secretStore)

    database.withTransactionSync(() => {
      for (const statement of migration.statements) database.execSync(statement)
      database.execSync(`PRAGMA user_version = ${migration.version}`)
    })
  }
}
