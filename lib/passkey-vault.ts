import type { PasskeyBiodata, PasskeyCardVault } from "@/lib/types";

const PRF_SALT = new TextEncoder().encode("Vexo/card/prf/v1");
export const MAX_PASSKEY_VAULT_BYTES = 3500;

type AssertionExtensions = {
  largeBlob?: {
    supported?: boolean;
    blob?: ArrayBuffer;
    written?: boolean;
  };
  prf?: {
    enabled?: boolean;
    results?: {
      first?: ArrayBuffer;
    };
  };
};

function bytesToB64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function b64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function aesKeyFromPrf(raw: ArrayBuffer) {
  const material = raw.byteLength >= 32 ? raw.slice(0, 32) : await crypto.subtle.digest("SHA-256", raw);
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function normalizeBiodata(
  name: string,
  extra: Record<string, unknown> = {},
): PasskeyBiodata {
  const clean =
    extra && typeof extra === "object" && !Array.isArray(extra) ? extra : {};
  return {
    name: name.trim() || "Vexo",
    extra: clean,
  };
}

export function parseExtraJson(raw: string): Record<string, unknown> {
  const text = raw.trim();
  if (!text) return {};
  const value = JSON.parse(text) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Extra passkey data must be a small JSON object.");
  }
  return value as Record<string, unknown>;
}

export async function encodeCardVault(
  vault: PasskeyCardVault,
  prfFirst?: ArrayBuffer,
) {
  const json = new TextEncoder().encode(JSON.stringify(vault));
  if (json.byteLength > MAX_PASSKEY_VAULT_BYTES) {
    throw new Error(
      "That JSON is too large for the passkey. Keep name plus a small object.",
    );
  }
  if (!prfFirst) return json;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKeyFromPrf(prfFirst);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, json));
  const packed = new Uint8Array(1 + iv.length + ciphertext.length);
  packed[0] = 1;
  packed.set(iv, 1);
  packed.set(ciphertext, 13);
  return packed;
}

export async function decodeCardVault(
  blob: ArrayBuffer,
  prfFirst?: ArrayBuffer,
): Promise<PasskeyCardVault | null> {
  const bytes = new Uint8Array(blob);
  try {
    if (bytes[0] === 1 && prfFirst) {
      const iv = bytes.slice(1, 13);
      const ciphertext = bytes.slice(13);
      const key = await aesKeyFromPrf(prfFirst);
      const json = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      return JSON.parse(new TextDecoder().decode(json)) as PasskeyCardVault;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as PasskeyCardVault;
  } catch {
    if (prfFirst && bytes[0] !== 1) {
      try {
        return JSON.parse(new TextDecoder().decode(bytes)) as PasskeyCardVault;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function prfEvalFirst() {
  return PRF_SALT.buffer.slice(PRF_SALT.byteOffset, PRF_SALT.byteOffset + PRF_SALT.byteLength);
}

export function assertionExtensions(credential: PublicKeyCredential) {
  return credential.getClientExtensionResults() as AssertionExtensions;
}

export { bytesToB64, b64ToBytes };
