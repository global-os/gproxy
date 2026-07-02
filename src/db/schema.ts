import { pgTable, text, timestamp, boolean, index, serial, integer, pgEnum, customType, uniqueIndex, primaryKey, jsonb } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return 'bytea' },
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** Better Auth login session — not a workspace. */
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const instanceStateEnum = pgEnum('instance_state', [
  'starting',
  'running',
]);

export const directory = pgTable('directory', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parent_id: integer('parent_id').references((): any => directory.id),
  user_id: text('user_id').references(() => user.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('directory_parent_id_idx').on(table.parent_id),
  index('directory_user_id_idx').on(table.user_id),
]);

export const file = pgTable('file', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  content: bytea('content').notNull(),
  mime_type: text('mime_type').notNull(),
  parent_id: integer('parent_id').notNull().references(() => directory.id),
  user_id: text('user_id').references(() => user.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  is_stock: boolean('is_stock').default(false).notNull(),
}, (table) => [
  index('file_parent_id_idx').on(table.parent_id),
  index('file_user_id_idx').on(table.user_id),
]);

export const image = pgTable('image', {
  id: serial('id').primaryKey(),
  directory_id: integer('directory_id').notNull().references(() => directory.id),
  directory_checksum: text('directory_checksum'),
  tar_checksum: text('tar_checksum'),
  tar_bytes: bytea('tar_bytes'),
  cache_key: text('cache_key'),
});

/** A user's Global PC — tasks, workspaces, and icon prefs. */
export const globalPc = pgTable('global_pc', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('My Global PC'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('global_pc_user_id_idx').on(table.user_id),
]);

export const globalPcIcon = pgTable('global_pc_icon', {
  id: serial('id').primaryKey(),
  global_pc_id: integer('global_pc_id').notNull().references(() => globalPc.id, { onDelete: 'cascade' }),
  entry_name: text('entry_name').notNull(),
  icon_id: text('icon_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('global_pc_icon_global_pc_id_idx').on(table.global_pc_id),
  uniqueIndex('global_pc_icon_entry_uidx').on(table.global_pc_id, table.entry_name),
]);

/** Persistent desk on a Global PC. */
export const workspace = pgTable('workspace', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => user.id),
  global_pc_id: integer('global_pc_id').references(() => globalPc.id),
  name: text('name'),
}, (table) => [
  index('workspace_global_pc_id_idx').on(table.global_pc_id),
]);

/** Workspace-local .gapp execution — owns windows and instances. Not a task. */
export const process = pgTable('process', {
  id: serial('id').primaryKey(),
  workspace_id: integer('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  /** Null for srcdoc (non-.gapp) processes. */
  directory_id: integer('directory_id').references(() => directory.id),
  /** Display name for srcdoc processes; null for .gapp processes (name comes from directory). */
  bundle_name: text('bundle_name'),
}, (table) => [
  index('process_workspace_id_idx').on(table.workspace_id),
  uniqueIndex('process_workspace_directory_uidx').on(table.workspace_id, table.directory_id),
]);

/** Global PC work — short or long lived; not workspace-scoped. */
export const task = pgTable('task', {
  id: serial('id').primaryKey(),
  global_pc_id: integer('global_pc_id').notNull().references(() => globalPc.id, { onDelete: 'cascade' }),
  directory_id: integer('directory_id').references(() => directory.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_used_at: timestamp('last_used_at').defaultNow().notNull(),
}, (table) => [
  index('task_global_pc_id_idx').on(table.global_pc_id),
]);

/** Live runtime for a process or task. Public URL = `{slug}.app.onetrueos.com`. */
export const instances = pgTable('instances', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  process_id: integer('process_id').references(() => process.id, { onDelete: 'cascade' }),
  image_id: integer('image_id').references(() => image.id),
  directory_checksum: text('directory_checksum').notNull(),
  state: instanceStateEnum('state').notNull().default('starting'),
  last_used_at: timestamp('last_used_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('instances_process_id_idx').on(table.process_id),
]);

/** LRU metadata for extracted instance bundles served from Postgres. */
export const instanceBundleCache = pgTable('instance_bundle_cache', {
  instance_id: integer('instance_id').primaryKey().references(() => instances.id, { onDelete: 'cascade' }),
  directory_checksum: text('directory_checksum').notNull(),
  last_used_at: timestamp('last_used_at').defaultNow().notNull(),
  byte_size: integer('byte_size').notNull(),
}, (table) => [
  index('instance_bundle_cache_last_used_at_idx').on(table.last_used_at),
]);

/** Extracted files for a cached instance bundle. */
export const instanceBundleFile = pgTable('instance_bundle_file', {
  instance_id: integer('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  content: bytea('content').notNull(),
}, (table) => [
  primaryKey({ columns: [table.instance_id, table.path] }),
  index('instance_bundle_file_instance_id_idx').on(table.instance_id),
]);

/** UI chrome for a process on a desk. Grouped via process → workspace. */
export const workspaceWindow = pgTable('workspace_window', {
  id: serial('id').primaryKey(),
  process_id: integer('process_id').notNull().references(() => process.id, { onDelete: 'cascade' }),
  /** Null for srcdoc windows that have no running instance. */
  instance_id: integer('instance_id').references(() => instances.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  bundle_name: text('bundle_name').notNull(),
  x: integer('x').notNull().default(0),
  y: integer('y').notNull().default(0),
  width: integer('width').notNull().default(720),
  height: integer('height').notNull().default(480),
  z_index: integer('z_index').notNull().default(1),
  last_focused_at: timestamp('last_focused_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  /** Inline HTML content; mutually exclusive with instance_id. */
  srcdoc: text('srcdoc'),
}, (table) => [
  index('workspace_window_process_id_idx').on(table.process_id),
]);

export const workspaceLog = pgTable('workspace_log', {
  id: serial('id').primaryKey(),
  workspace_id: integer('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  source: text('source').notNull(),
  message: text('message').notNull(),
  detail: text('detail'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('workspace_log_workspace_id_idx').on(table.workspace_id),
])

/** Append-only workspace events streamed to connected desk clients (SSE). */
export const workspaceEvent = pgTable('workspace_event', {
  id: serial('id').primaryKey(),
  workspace_id: integer('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: text('payload').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('workspace_event_workspace_id_idx').on(table.workspace_id),
  index('workspace_event_workspace_id_id_idx').on(table.workspace_id, table.id),
])
/** Proxied external website — each webview gets a unique subdomain. */
export const webview = pgTable('webview', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  process_id: integer('process_id').notNull().references(() => process.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('webview_process_id_idx').on(table.process_id),
])

/** Per-webview routing rules (match + action). */
export const webviewRule = pgTable('webview_rule', {
  id: serial('id').primaryKey(),
  webview_id: integer('webview_id').notNull().references(() => webview.id, { onDelete: 'cascade' }),
  ord: integer('ord').notNull(),
  match: jsonb('match').notNull(),
  action: jsonb('action').notNull(),
}, (table) => [
  index('webview_rule_webview_id_ord_idx').on(table.webview_id, table.ord),
])

export const proxyRecordingSession = pgTable('proxy_recording_session', {
  id: serial('id').primaryKey(),
  started_at: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  stopped_at: timestamp('stopped_at', { withTimezone: true }),
})

export const proxyTraffic = pgTable('proxy_traffic', {
  id: serial('id').primaryKey(),
  session_id: integer('session_id').notNull().references(() => proxyRecordingSession.id, { onDelete: 'cascade' }),
  recorded_at: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  slug: text('slug').notNull(),
  method: text('method').notNull(),
  upstream_url: text('upstream_url').notNull(),
  request_headers: jsonb('request_headers').$type<{ name: string; value: string }[]>().notNull(),
  request_body: text('request_body'),
  response_status: integer('response_status'),
  response_headers: jsonb('response_headers').$type<{ name: string; value: string }[]>().notNull(),
  response_body: text('response_body'),
  response_body_encoding: text('response_body_encoding'),
  duration_ms: integer('duration_ms'),
}, (table) => [
  index('proxy_traffic_session_id_idx').on(table.session_id, table.id),
])
