import { desc, eq } from "drizzle-orm";
import { passes, walletSerials } from "@/db/turso-schema";
import { getTurso } from "@/lib/turso";
import {
  buildWalletPass,
  mergePassPatch,
  type PassPlatform,
  type WalletPassPayload,
} from "@/lib/wallet-pass";

function parsePayload(raw: string): WalletPassPayload | null {
  try {
    const value = JSON.parse(raw) as WalletPassPayload;
    if (!value?.serial) return null;
    return {
      ...value,
      extra: value.extra ?? {},
      terms: value.terms ?? [],
      status: value.status ?? "active",
      autoUpdate: value.autoUpdate ?? true,
      notifications: value.notifications ?? true,
      lockScreen: value.lockScreen ?? true,
    };
  } catch {
    return null;
  }
}

function toRow(pass: WalletPassPayload) {
  const now = new Date();
  return {
    serial: pass.serial,
    username: pass.username,
    platform: pass.platform,
    name: pass.name,
    description: pass.description,
    lastMessage: pass.lastMessage,
    nounSeed: pass.nounSeed,
    extraJson: JSON.stringify(pass.extra ?? {}),
    termsJson: JSON.stringify(pass.terms ?? []),
    issuerName: pass.issuerName,
    issuerEmail: pass.issuerEmail,
    status: pass.status,
    autoUpdate: pass.autoUpdate,
    notifications: pass.notifications,
    lockScreen: pass.lockScreen,
    payloadJson: JSON.stringify(pass),
    createdAt: pass.createdAt ? new Date(pass.createdAt) : now,
    updatedAt: now,
  };
}

function fromRow(row: {
  payloadJson: string;
  extraJson?: string | null;
  termsJson?: string | null;
  lastMessage?: string;
  name?: string;
  description?: string;
  status?: string;
  autoUpdate?: boolean;
  notifications?: boolean;
  lockScreen?: boolean;
  nounSeed?: string;
}): WalletPassPayload | null {
  const payload = parsePayload(row.payloadJson);
  if (!payload) return null;
  return {
    ...payload,
    name: row.name ?? payload.name,
    description: row.description ?? payload.description,
    lastMessage: row.lastMessage ?? payload.lastMessage,
    nounSeed: row.nounSeed ?? payload.nounSeed,
    extra: row.extraJson
      ? (() => {
          try {
            return JSON.parse(row.extraJson) as Record<string, unknown>;
          } catch {
            return payload.extra;
          }
        })()
      : payload.extra,
    terms: row.termsJson
      ? (() => {
          try {
            return JSON.parse(row.termsJson) as string[];
          } catch {
            return payload.terms;
          }
        })()
      : payload.terms,
    status: (row.status as WalletPassPayload["status"]) ?? payload.status,
    autoUpdate: row.autoUpdate ?? payload.autoUpdate,
    notifications: row.notifications ?? payload.notifications,
    lockScreen: row.lockScreen ?? payload.lockScreen,
  };
}

export async function createPass(input: {
  platform: PassPlatform;
  username: string;
  displayName: string;
  bio?: string;
  avatarSeed?: string;
  extra?: Record<string, unknown>;
}) {
  const pass = buildWalletPass({
    platform: input.platform,
    username: input.username,
    extra: input.extra,
    card: {
      displayName: input.displayName,
      bio: input.bio ?? "",
      avatarSeed: input.avatarSeed ?? "{}",
    },
  });

  const db = await getTurso();
  if (!db) return { ok: true as const, source: "offline" as const, pass };

  try {
    await db.insert(passes).values(toRow(pass));
    return { ok: true as const, source: "turso" as const, pass };
  } catch {
    return { ok: true as const, source: "offline" as const, pass };
  }
}

export async function getPass(serial: string) {
  const db = await getTurso();
  if (!db) return { source: "offline" as const, pass: null };

  try {
    const modern = await db.select().from(passes).where(eq(passes.serial, serial)).limit(1);
    if (modern[0]) return { source: "turso" as const, pass: fromRow(modern[0]) };

    const legacy = await db
      .select()
      .from(walletSerials)
      .where(eq(walletSerials.serial, serial))
      .limit(1);
    if (legacy[0]) {
      return { source: "turso" as const, pass: parsePayload(legacy[0].payloadJson) };
    }
    return { source: "turso" as const, pass: null };
  } catch {
    return { source: "offline" as const, pass: null };
  }
}

export async function listPasses(username: string) {
  const db = await getTurso();
  if (!db) return { source: "offline" as const, passes: [] as WalletPassPayload[] };

  try {
    const rows = await db
      .select()
      .from(passes)
      .where(eq(passes.username, username))
      .orderBy(desc(passes.updatedAt));
    return {
      source: "turso" as const,
      passes: rows.map(fromRow).filter((item): item is WalletPassPayload => Boolean(item)),
    };
  } catch {
    return { source: "offline" as const, passes: [] as WalletPassPayload[] };
  }
}

export async function updatePass(
  serial: string,
  patch: Parameters<typeof mergePassPatch>[1],
) {
  const current = await getPass(serial);
  if (!current.pass) {
    return { ok: false as const, source: current.source, error: "Pass not found" };
  }

  const next = mergePassPatch(current.pass, patch);
  const db = await getTurso();
  if (!db) {
    return { ok: true as const, source: "offline" as const, pass: next };
  }

  try {
    await db
      .update(passes)
      .set(toRow(next))
      .where(eq(passes.serial, serial));
    return { ok: true as const, source: "turso" as const, pass: next };
  } catch {
    return { ok: true as const, source: "offline" as const, pass: next };
  }
}

export async function revokePass(serial: string) {
  return updatePass(serial, { status: "revoked" });
}
