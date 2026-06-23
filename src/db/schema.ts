import { pgTable, text, timestamp, boolean, index, serial, integer, pgEnum, customType } from "drizzle-orm/pg-core";

// bytea was a first-class export in drizzle-orm beta (^1.0.0-beta.9-e89174b).
// Stable drizzle-orm (^0.45.2) dropped it — use customType in the meantime.
// To revert: replace this block with `bytea` in the import above once it's re-exported.
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

export const processDomainTypeEnum = pgEnum('process_domain_type', ['proxy', 'local_exe']);

export const directory = pgTable('directory', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parent_id: integer('parent_id').references((): any => directory.id),
  user_id: text('user_id').references(() => user.id),
}, (table) => [
  index('directory_parent_id_idx').on(table.parent_id),
  index('directory_user_id_idx').on(table.user_id),
]);

export const file = pgTable('file', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  content: bytea('content').notNull(),
  mime_type: text('mime_type').notNull(),
  hash_method: text('hash_method').notNull(),
  parent_id: integer('parent_id').notNull().references(() => directory.id),
  user_id: text('user_id').references(() => user.id),
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
});

export const process = pgTable('process', {
  id: serial('id').primaryKey(),
  session_id: serial('session_id').notNull().references(() => sessions.id),
});

export const processDomains = pgTable('process_domains', {
  id: serial('id').primaryKey(),
  type: processDomainTypeEnum('type').notNull().default('proxy'),
  slug: text('domain_slug').notNull(),
  process_id: integer('process_id').notNull().references(() => process.id),
  cleartext: text('cleartext').notNull(),
  image_id: integer('image_id').references(() => image.id),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => user.id),
  name: text("name"),
});
