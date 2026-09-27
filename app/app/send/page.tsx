"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import {
  bindPasskeyWallet,
  currentUser,
} from "@/lib/store";
import { shortenAddress, spendAddress } from "@/lib/passkey-wallet";
import {
  hasBundler,
  resolveSmartAccountAddress,
  sendEthWithPasskey,
} from "@/lib/smart-account";
import { useVexo } from "@/lib/use-vexo";

export default function SendPage() {
  useVexo();
  const user = currentUser();
  const wallet = user?.passkeyWallet;
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const [account, setAccount] = useState(wallet ? spendAddress(wallet) : "");

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    void resolveSmartAccountAddress(wallet)
      .then((address) => {
        if (cancelled) return;
        setAccount(address);
        if (wallet.kernelAddress !== address) {
          bindPasskeyWallet({ ...wallet, kernelAddress: address });
        }
      })
      .catch(() => {
        if (!cancelled) setAccount(spendAddress(wallet));
      });
    return () => {
      cancelled = true;
    };
  }, [wallet?.credentialId]);

  async function send() {
    if (!wallet) return;
    setBusy(true);
    setError("");
    setHash("");
    try {
      const result = await sendEthWithPasskey({ wallet, to, amount });
      setHash(result.hash);
      setAccount(result.account);
      bindPasskeyWallet({ ...wallet, kernelAddress: result.account });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  if (!wallet) {
    return (
      <main className="relative px-5 pt-8">
        <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
          Send
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          Face ID first
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          This pass spends from a Kernel smart account. Bind a passkey on the
          mint page, then come back.
        </p>
        <Link href="/app/mint" className="btn btn-fill pressable mt-6 w-full">
          Bind passkey wallet
        </Link>
      </main>
    );
  }

  return (
    <main className="relative px-5 pt-8 pb-8">
      <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
        Send ETH
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        UserOp, Face ID
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink/65">
        The passkey authorizes an ERC-4337 UserOp on Base. There is no seed.
        Face ID signs. A bundler posts it.
      </p>

      <p className="mt-5 rounded-2xl border border-ink/10 bg-white/70 px-4 py-3 font-mono text-xs leading-5 break-all">
        {account ? shortenAddress(account) : "Resolving Kernel…"}
        {account ? (
          <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-ink/40">
            Kernel 0.3.1 · EntryPoint 0.7 · Base
          </span>
        ) : null}
      </p>

      {!hasBundler() ? (
        <p className="mt-3 rounded-2xl border border-dashed border-violet/35 bg-white/70 px-4 py-3 text-sm text-ink/65">
          Set <code>NEXT_PUBLIC_PIMLICO_API_KEY</code> to broadcast. Face ID
          still runs when you send.
        </p>
      ) : null}

      <label className="mt-6 block text-xs uppercase tracking-[0.16em] text-ink/45">
        To
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x…"
          autoComplete="off"
          className="mt-2 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 font-mono text-sm outline-none focus:border-violet"
        />
      </label>

      <label className="mt-4 block text-xs uppercase tracking-[0.16em] text-ink/45">
        Amount (ETH)
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.001"
          inputMode="decimal"
          className="mt-2 w-full rounded-2xl border border-ink/15 bg-white/80 px-4 py-3 font-mono text-sm outline-none focus:border-violet"
        />
      </label>

      {error ? (
        <p className="mt-4 text-sm text-rose-700">{error}</p>
      ) : null}

      {hash ? (
        <a
          href={`https://basescan.org/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block break-all font-mono text-xs text-violet"
        >
          Sent · {shortenAddress(hash)}
        </a>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void send()}
        className="btn btn-fill pressable mt-6 w-full"
      >
        <Fingerprint size={18} />
        {busy ? "Waiting for Face ID…" : "Sign with Face ID"}
      </button>
    </main>
  );
}
