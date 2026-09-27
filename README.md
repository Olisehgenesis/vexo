# Vexo Social

Wallet-native social identity and Proof-of-Meet.

> Don't just exchange contacts. Mint the connection.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Privy

Create an app in the Privy dashboard and set `NEXT_PUBLIC_PRIVY_APP_ID` in `.env.local`. Until that exists, Continue with Privy uses a local identity session. Private keys are still generated in the browser and stored AES-GCM wrapped on the user record.

See `docs/ARCHITECTURE.md` for the full product model.
