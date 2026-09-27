import {
  boolean,
  bigint,
  check,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Vexo identity is a Wallet Pass, not a chat account.
 *
 * Auth: WebAuthn passkeys on device (Apple / Google / Samsung).
 * Keys: one 24-word BIP39 seed per user — ciphertext only.
 * Profile: minted as a pass that can tap a site or a terminal,
 * and can hold ETH (onchain) and USD (custodial / stable).
 * Chat / Proof of Meet are secondary.
 */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  handle: text("handle").notNull().unique(),
  givenName: text("given_name").notNull(),
  familyName: text("family_name").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passkeys = pgTable(
  "passkeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull().unique(),
    publicKey: text("public_key").notNull(),
    counter: bigint("counter", { mode: "bigint" }).notNull().default(sql`0`),
    transports: text("transports").array().notNull().default([]),
    deviceLabel: text("device_label"),
    backedBy: text("backed_by"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "passkeys_backed_by",
      sql`${t.backedBy} is null or ${t.backedBy} in ('apple', 'google', 'samsung')`,
    ),
  ],
);

/** Encrypted 24-word mnemonic. Never store plaintext words. */
export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    wordCount: smallint("word_count").notNull().default(24),
    encryptedMnemonic: text("encrypted_mnemonic").notNull(),
    wrapIv: text("wrap_iv").notNull(),
    wrapSalt: text("wrap_salt").notNull(),
    wrapVersion: smallint("wrap_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("wallets_word_count_24", sql`${t.wordCount} = 24`)],
);

export const chainAccounts = pgTable(
  "chain_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    chain: text("chain").notNull(),
    derivationPath: text("derivation_path").notNull(),
    address: text("address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("chain_accounts_wallet_path").on(t.walletId, t.chain, t.derivationPath)],
);

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarStyle: text("avatar_style").notNull(),
  avatarSeed: text("avatar_seed").notNull(),
  avatarGender: text("avatar_gender"),
  isPrimary: boolean("is_primary").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const walletPasses = pgTable(
  "wallet_passes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    serialNumber: text("serial_number").notNull().unique(),
    nfcEnabled: boolean("nfc_enabled").notNull().default(true),
    status: text("status").notNull().default("active"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("wallet_passes_card_platform").on(t.cardId, t.platform),
    check(
      "wallet_passes_platform",
      sql`${t.platform} in ('apple', 'google', 'samsung')`,
    ),
    check(
      "wallet_passes_status",
      sql`${t.status} in ('active', 'revoked', 'expired')`,
    ),
  ],
);

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    asset: text("asset").notNull(),
    kind: text("kind").notNull(),
    chain: text("chain"),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("holdings_user_asset_kind_chain").on(t.userId, t.asset, t.kind, t.chain),
    check("holdings_kind", sql`${t.kind} in ('onchain', 'custodial')`),
  ],
);

export const authGrants = pgTable(
  "auth_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    passId: uuid("pass_id").references(() => walletPasses.id, {
      onDelete: "set null",
    }),
    channel: text("channel").notNull(),
    audience: text("audience").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [check("auth_grants_channel", sql`${t.channel} in ('web', 'terminal')`)],
);

export const proofsOfMeet = pgTable("proofs_of_meet", {
  id: uuid("id").primaryKey().defaultRandom(),
  aUserId: uuid("a_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bUserId: uuid("b_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  aCardId: uuid("a_card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  bCardId: uuid("b_card_id").references(() => cards.id, { onDelete: "set null" }),
  eventName: text("event_name"),
  place: text("place"),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetId: uuid("meet_id")
    .notNull()
    .references(() => proofsOfMeet.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const threadMembers = pgTable(
  "thread_members",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [unique("thread_members_pk").on(t.threadId, t.userId)],
);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const selfDisclosures = pgTable("self_disclosures", {
  sessionId: text("session_id").primaryKey(),
  deviceId: text("device_id").notNull(),
  nullifier: text("nullifier"),
  attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Passkey = typeof passkeys.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type ChainAccount = typeof chainAccounts.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type WalletPass = typeof walletPasses.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type AuthGrant = typeof authGrants.$inferSelect;
