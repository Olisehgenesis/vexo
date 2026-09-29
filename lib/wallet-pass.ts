import type { VexoCard } from "@/lib/types";
import { parseNounSeed } from "@/lib/noun-seed";

export type PassPlatform = "apple" | "google" | "samsung";
export type PassStatus = "active" | "revoked";

export type WalletPassPayload = {
  serial: string;
  organizationName: string;
  description: string;
  name: string;
  username: string;
  lastMessage: string;
  extra: Record<string, unknown>;
  terms: string[];
  issuerName: string;
  issuerEmail: string;
  updatedAt: string;
  createdAt?: string;
  nounSeed: string;
  platform: PassPlatform;
  status: PassStatus;
  autoUpdate: boolean;
  notifications: boolean;
  lockScreen: boolean;
};

export function walletSerial() {
  const n = () => Math.floor(100000 + Math.random() * 900000);
  return `${n()}-${n().toString().slice(0, 3)}-${n().toString().slice(0, 3)}`;
}

const DEFAULT_TERMS = [
  "The passkey is the signer. Vexo does not store your passkey.",
  "Name and a small JSON bag can be sealed onto the passkey on this device.",
  "Turso stores the public pass (handle, Noun seed, serial, messages). Not the passkey.",
  "This pass cannot be sold or combined with another identity.",
];

export function buildWalletPass(input: {
  card: Pick<VexoCard, "displayName" | "bio" | "avatarSeed">;
  username: string;
  platform: PassPlatform;
  serial?: string;
  extra?: Record<string, unknown>;
}): WalletPassPayload {
  const serial = input.serial ?? walletSerial();
  const seed = parseNounSeed(input.card.avatarSeed);
  const now = new Date().toISOString();
  return {
    serial,
    organizationName: "Vexo",
    description: `${input.card.displayName} · Vexo pass`,
    name: input.card.displayName,
    username: input.username,
    lastMessage:
      input.card.bio?.trim() ||
      "Proof of pass. This card lives on your device and in Apple Wallet, Google Wallet, or Samsung Wallet.",
    extra: input.extra ?? {},
    terms: DEFAULT_TERMS,
    issuerName: "Vexo",
    issuerEmail: "hello@vexo.social",
    updatedAt: now,
    createdAt: now,
    nounSeed: seed ? JSON.stringify(seed) : input.card.avatarSeed,
    platform: input.platform,
    status: "active",
    autoUpdate: true,
    notifications: true,
    lockScreen: true,
  };
}

export function mergePassPatch(
  current: WalletPassPayload,
  patch: Partial<
    Pick<
      WalletPassPayload,
      | "name"
      | "description"
      | "lastMessage"
      | "extra"
      | "terms"
      | "nounSeed"
      | "status"
      | "autoUpdate"
      | "notifications"
      | "lockScreen"
    >
  >,
): WalletPassPayload {
  return {
    ...current,
    ...patch,
    extra: patch.extra ? { ...current.extra, ...patch.extra } : current.extra,
    terms: patch.terms ?? current.terms,
    updatedAt: new Date().toISOString(),
  };
}
