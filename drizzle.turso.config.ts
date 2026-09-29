import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/turso-schema.ts",
  out: "./db/turso-migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "",
    authToken: process.env.TURSO_AUTH_TOKEN ?? "",
  },
});
