import { getAddress, keccak256, type Address, type Hex } from "viem";
import { createWebAuthnCredential } from "viem/account-abstraction";
import type { PasskeyWallet } from "@/lib/types";

function fromB64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uncompressedPoint(spki: Uint8Array) {
  const idx = spki.indexOf(0x04);
  if (idx === -1 || idx + 65 > spki.length) {
    throw new Error("That passkey is not a P-256 key we can bind to Ethereum.");
  }
  return spki.slice(idx, idx + 65);
}

export function publicKeyFromSpki(spkiB64url: string): Hex {
  const point = uncompressedPoint(fromB64url(spkiB64url));
  return `0x${Array.from(point, (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}

export function addressFromPublicKey(publicKey: Hex): Address {
  const bytes = publicKey.startsWith("0x04") ? publicKey.slice(4) : publicKey.slice(2);
  const hash = keccak256(`0x${bytes}` as Hex);
  return getAddress(`0x${hash.slice(-40)}`);
}

export function shortenAddress(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function spendAddress(wallet: PasskeyWallet) {
  return wallet.kernelAddress ?? wallet.address;
}

export function credentialFromWallet(wallet: PasskeyWallet) {
  const publicKey = wallet.publicKey ?? (wallet.publicKeySpki
    ? publicKeyFromSpki(wallet.publicKeySpki)
    : null);
  if (!publicKey) {
    throw new Error("This passkey has no public key on this device.");
  }
  return { id: wallet.credentialId, publicKey };
}

function assertWebAuthn() {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("This browser cannot use a passkey.");
  }
}

export async function createPasskeyWallet(input: {
  userId: string;
  username: string;
  displayName: string;
}): Promise<PasskeyWallet> {
  assertWebAuthn();

  const credential = await createWebAuthnCredential({
    name: `${input.displayName || input.username} · Vexo`,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "required",
    },
    rp: {
      id: window.location.hostname,
      name: "Vexo",
    },
  });

  return {
    credentialId: credential.id,
    publicKey: credential.publicKey,
    address: addressFromPublicKey(credential.publicKey),
    createdAt: new Date().toISOString(),
  };
}

export async function requestPasskeyAssertion(knownIds: string[] = []) {
  assertWebAuthn();

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const allowCredentials = knownIds
    .map((id) => {
      try {
        const bytes = fromB64url(id);
        return {
          type: "public-key" as const,
          id: bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer,
        };
      } catch {
        return null;
      }
    })
    .filter((item): item is { type: "public-key"; id: ArrayBuffer } => Boolean(item));

  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      userVerification: "required",
      timeout: 120_000,
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
    },
    mediation: "required",
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("No passkey was selected.");
  }

  return { credentialId: credential.id };
}
