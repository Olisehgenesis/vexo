import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/turso-schema";

export function tursoConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export async function getTurso() {
  if (!tursoConfigured()) return null;
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    await client.execute(
      "CREATE TABLE IF NOT EXISTS handles (username TEXT PRIMARY KEY, created_at INTEGER NOT NULL)",
    );
    await client.execute(
      "CREATE TABLE IF NOT EXISTS noun_seeds (username TEXT PRIMARY KEY, seed_json TEXT NOT NULL, updated_at INTEGER NOT NULL)",
    );
    await client.execute(
      "CREATE TABLE IF NOT EXISTS wallet_serials (serial TEXT PRIMARY KEY, username TEXT NOT NULL, platform TEXT NOT NULL, payload_json TEXT NOT NULL, updated_at INTEGER NOT NULL)",
    );
    await client.execute(
      "CREATE TABLE IF NOT EXISTS passes (serial TEXT PRIMARY KEY, username TEXT NOT NULL, platform TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, last_message TEXT NOT NULL, noun_seed TEXT NOT NULL, extra_json TEXT NOT NULL DEFAULT '{}', terms_json TEXT NOT NULL, issuer_name TEXT NOT NULL, issuer_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', auto_update INTEGER NOT NULL DEFAULT 1, notifications INTEGER NOT NULL DEFAULT 1, lock_screen INTEGER NOT NULL DEFAULT 1, payload_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    );
    return drizzle(client, { schema });
  } catch {
    return null;
  }
}
