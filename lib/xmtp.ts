/**
 * XMTP v7 (browser-sdk 7.x) helpers — using the public Client API
 *
 * Client.create(signer, options) handles identity registration automatically.
 * No manual registration flow needed.
 */

import { Client, IdentifierKind, type Signer, type XmtpEnv } from "@xmtp/browser-sdk";
import { hexToBytes } from "viem";

export const XMTP_ENV = (process.env.NEXT_PUBLIC_XMTP_ENV ?? "dev") as XmtpEnv;

/** Build an XMTP-compatible EOA Signer from a wagmi signMessage function */
export function buildXmtpSigner(
  address: `0x${string}`,
  wagmiSignMessage: (message: string) => Promise<`0x${string}`>
): Signer {
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: address,
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string | Uint8Array) => {
      const text =
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message);
      const hex = await wagmiSignMessage(text);
      return hexToBytes(hex);
    },
  };
}

/**
 * Create an XMTP Client for a given wallet address.
 * Client.create() handles identity registration on first run.
 */
export async function createXmtpClient(
  address: `0x${string}`,
  wagmiSignMessage: (message: string) => Promise<`0x${string}`>
): Promise<Client> {
  const signer = buildXmtpSigner(address, wagmiSignMessage);
  return Client.create(signer, { env: XMTP_ENV } as any);
}

/** Shorten an address or inboxId for display */
export function shortId(id: string, chars = 6): string {
  if (id.length <= chars * 2 + 2) return id;
  return `${id.slice(0, chars + 2)}…${id.slice(-chars)}`;
}

/** Format a Date to a readable time string (always in the user's local timezone) */
export function formatDate(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

/** Format a nanosecond bigint timestamp to a readable time string */
export function formatNs(ns: bigint): string {
  return formatDate(new Date(Number(ns / 1_000_000n)));
}
