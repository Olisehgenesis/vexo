import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Optional extras. The app runs without these tables. Never store passkeys. */
export const handles = sqliteTable("handles", {
  username: text("username").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const nounSeeds = sqliteTable("noun_seeds", {
  username: text("username").primaryKey(),
  seedJson: text("seed_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const walletSerials = sqliteTable("wallet_serials", {
  serial: text("serial").primaryKey(),
  username: text("username").notNull(),
  platform: text("platform").notNull(),
  payloadJson: text("payload_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const passes = sqliteTable("passes", {
  serial: text("serial").primaryKey(),
  username: text("username").notNull(),
  platform: text("platform").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  lastMessage: text("last_message").notNull(),
  nounSeed: text("noun_seed").notNull(),
  extraJson: text("extra_json").notNull().default("{}"),
  termsJson: text("terms_json").notNull(),
  issuerName: text("issuer_name").notNull(),
  issuerEmail: text("issuer_email").notNull(),
  status: text("status").notNull().default("active"),
  autoUpdate: integer("auto_update", { mode: "boolean" }).notNull().default(true),
  notifications: integer("notifications", { mode: "boolean" }).notNull().default(true),
  lockScreen: integer("lock_screen", { mode: "boolean" }).notNull().default(true),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
