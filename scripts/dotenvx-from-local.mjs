import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const KEYS = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_PIMLICO_API_KEY",
  "NEXT_PUBLIC_BUNDLER_URL",
  "NEXT_PUBLIC_RPC_URL",
  "SELF_API_KEY",
  "SELF_FLOW_ID",
  "SELF_WEBHOOK_SECRET",
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "NEON_BRANCH",
];

function envFromLocal(key) {
  const result = spawnSync(
    "npx",
    [
      "dotenvx",
      "run",
      "-f",
      ".env.local",
      "--",
      "node",
      "-e",
      `process.stdout.write(process.env[${JSON.stringify(key)}] ?? "")`,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`dotenvx get ${key} failed`);
  }
  return result.stdout;
}

function setEncrypted(file, key, value) {
  const result = spawnSync("npx", ["dotenvx", "set", key, value, "-f", file], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`dotenvx set ${key} ${file} failed: ${result.stderr}`);
  }
}

const bag = {};
for (const key of KEYS) {
  const value = envFromLocal(key);
  if (value) bag[key] = value;
}

writeFileSync(".env", "");
writeFileSync(".env.production", "");

if (bag.TURSO_DATABASE_URL) {
  setEncrypted(".env", "TURSO_DATABASE_URL", bag.TURSO_DATABASE_URL);
  setEncrypted(".env.production", "TURSO_DATABASE_URL", bag.TURSO_DATABASE_URL);
}
if (bag.TURSO_AUTH_TOKEN) {
  setEncrypted(".env", "TURSO_AUTH_TOKEN", bag.TURSO_AUTH_TOKEN);
  setEncrypted(".env.production", "TURSO_AUTH_TOKEN", bag.TURSO_AUTH_TOKEN);
}

setEncrypted(".env", "NEXT_PUBLIC_APP_URL", "http://localhost:3004");
setEncrypted(
  ".env.production",
  "NEXT_PUBLIC_APP_URL",
  "https://vexo-three-rho.vercel.app",
);

for (const key of KEYS) {
  if (key.startsWith("TURSO_") || key === "NEXT_PUBLIC_APP_URL") continue;
  if (!bag[key]) continue;
  setEncrypted(".env", key, bag[key]);
  setEncrypted(".env.production", key, bag[key]);
}

console.log("encrypted .env and .env.production (secret values not printed)");
