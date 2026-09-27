# Vexo — Product Architecture

Vexo is a **wallet pass identity**. Chat is secondary.

You mint a living profile into Apple Wallet, Google Wallet, or Samsung Pass. That pass is you: it authenticates on websites and physical terminals, and it can hold ETH (onchain) and USD (custodial / stable). Sign-in is an on-device passkey. Keys for chains come from a 24-word BIP39 seed that never sits in the database as plaintext.

---

## 1. Product architecture

```
Person
  → on-device passkey (Apple / Google / Samsung)
    → Vexo user + living card
      → Wallet Pass (NFC / QR)  → web site or POS terminal
      → encrypted 24-word HD wallet → ETH, SOL, … addresses
      → holdings: ETH onchain, USD custodial
```

Proof of Meet and encrypted threads exist, but they are not the product.

---

## 2. Data model (Neon Postgres)

| Entity | Purpose |
| --- | --- |
| `users` | Handle + name. No passwords. |
| `passkeys` | WebAuthn credentials. The only login. |
| `wallets` | AES-wrapped 24-word mnemonic (ciphertext, iv, salt). |
| `chain_accounts` | Derived public addresses + paths. No private keys. |
| `cards` | Living profile minted into a pass. |
| `wallet_passes` | Apple / Google / Samsung serial + NFC. |
| `holdings` | ETH / USD (and stables) balances. |
| `auth_grants` | Site or terminal session opened by tapping the pass. |
| `proofs_of_meet` / `threads` / `messages` | Afterthought social layer. |

Schema: `db/schema.ts`. Push: `npm run db:push`.

- Profile and keys live **on the device**. Self Pre-KYC disclosures (name, ID number, DOB, gender, nationality, expiry, issuing state) fill the pass and are kept with the device record. Seed words stay ciphertext.

Two humanity paths:

- **Self** (Pre-KYC): government ID with disclosures — name, ID number, DOB, gender, nationality, expiry, issuing state. Those fields fill the pass. Unlocks wallet passes.
- **GoodDollar**: face-verify a Celo wallet. Unlocks UBI (G$) and free gas.

Do both if you want the pass and the UBI.

## 3. Keys

1. User creates a passkey on the device (iCloud Keychain, Google Password Manager, Samsung Pass).
2. Client generates a 24-word mnemonic.
3. Mnemonic is wrapped (WebAuthn PRF when available) and stored in `wallets.encrypted_mnemonic`.
4. Chain keys are derived locally (`m/44'/60'/0'/0/0` for ETH, etc.). Only addresses land in `chain_accounts`.

The server never sees seed words or private keys.
