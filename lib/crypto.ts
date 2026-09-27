const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toB64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromB64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveWrappingKey(secret: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 50_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createIdentityVault(wrappingSecret: string) {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await deriveWrappingKey(wrappingSecret, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    encoder.encode(JSON.stringify(privateJwk)),
  );

  return {
    vault: {
      ciphertext: toB64(ciphertext),
      iv: toB64(iv),
      salt: toB64(salt),
      publicKey: JSON.stringify(publicJwk),
      version: 1 as const,
    },
    publicJwk,
  };
}

export async function unwrapPrivateKey(
  wrappingSecret: string,
  vault: {
    ciphertext: string;
    iv: string;
    salt: string;
  },
) {
  const wrappingKey = await deriveWrappingKey(wrappingSecret, fromB64(vault.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(vault.iv) },
    wrappingKey,
    fromB64(vault.ciphertext),
  );
  const jwk = JSON.parse(decoder.decode(plain)) as JsonWebKey;
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
}

export async function importPublicKey(publicKeyJson: string) {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(publicKeyJson) as JsonWebKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

async function sharedAesKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
  return crypto.subtle.importKey("raw", bits, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptMessage(
  wrappingSecret: string,
  vault: { ciphertext: string; iv: string; salt: string },
  peerPublicKey: string,
  plaintext: string,
) {
  const privateKey = await unwrapPrivateKey(wrappingSecret, vault);
  const publicKey = await importPublicKey(peerPublicKey);
  const key = await sharedAesKey(privateKey, publicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );
  return { ciphertext: toB64(ciphertext), iv: toB64(iv) };
}

export async function decryptMessage(
  wrappingSecret: string,
  vault: { ciphertext: string; iv: string; salt: string },
  peerPublicKey: string,
  ciphertext: string,
  iv: string,
) {
  const privateKey = await unwrapPrivateKey(wrappingSecret, vault);
  const publicKey = await importPublicKey(peerPublicKey);
  const key = await sharedAesKey(privateKey, publicKey);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(iv) },
    key,
    fromB64(ciphertext),
  );
  return decoder.decode(plain);
}

export async function hashProof(payload: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomId(size = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, size);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
}
