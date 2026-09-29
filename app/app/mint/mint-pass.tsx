"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Apple, Smartphone, Wallet } from "lucide-react";
import { VexoCardFace } from "@/components/vexo-card";
import { GOODDOLLAR_CLAIM, GOODDOLLAR_WALLET } from "@/lib/gooddollar";
import { startGoodDollarFace } from "@/lib/gooddollar-client";
import {
  bindPasskeyWallet,
  canMintPass,
  currentUser,
  mintCardToWallet,
  primaryCard,
  saveGoodDollarProof,
  saveSelfProof,
} from "@/lib/store";
import { createPasskeyWallet, sealCardToPasskey, shortenAddress, spendAddress } from "@/lib/passkey-wallet";
import { resolveSmartAccountAddress } from "@/lib/smart-account";
import { useVexo } from "@/lib/use-vexo";

export default function MintPassPage() {
  useVexo();
  const router = useRouter();
  const params = useSearchParams();
  const user = currentUser();
  const card = user ? primaryCard(user.id) : null;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [address, setAddress] = useState(user?.celoAddress ?? "");

  const selfOk = user?.humanity?.self?.status === "valid";
  const gdOk = user?.humanity?.gooddollar?.isWhitelisted === true;
  const passReady = canMintPass(user);
  const sessionId = user?.humanity?.self?.sessionId;
  const wallet = user?.passkeyWallet;

  useEffect(() => {
    if (params.get("self") === "done" && sessionId) {
      void pollSelf(sessionId);
    }
  }, [params, sessionId]);

  async function pollSelf(id: string) {
    setBusy("self");
    setError("");
    try {
      for (let i = 0; i < 40; i += 1) {
        const res = await fetch(`/api/self/session/${id}`);
        const data = (await res.json()) as {
          status?: string;
          error?: string;
          disclosures?: {
            name?: string;
            idNumber?: string;
            dateOfBirth?: string;
            gender?: string;
            nationality?: string;
            expiryDate?: string;
            issuingState?: string;
          };
        };
        if (!res.ok) throw new Error(data.error ?? "Self check failed");
        if (data.status && data.status !== "pending") {
          saveSelfProof({
            sessionId: id,
            status: data.status as "valid" | "invalid" | "error" | "expired",
            verifiedAt:
              data.status === "valid" ? new Date().toISOString() : undefined,
            disclosures: data.disclosures,
          });
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Self check failed");
    } finally {
      setBusy("");
    }
  }

  async function bindPasskey() {
    if (!user) return;
    setBusy("passkey");
    setError("");
    try {
      const next = await createPasskeyWallet({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
      });
      try {
        next.kernelAddress = await resolveSmartAccountAddress(next);
      } catch {
        /* Kernel address resolves on Send when RPC is reachable. */
      }
      bindPasskeyWallet(next);
      try {
        const me = currentUser();
        const card = me ? primaryCard(me.id) : null;
        if (me) {
          await sealCardToPasskey({
            v: 1,
            wallet: next,
            username: me.username,
            displayName: me.displayName,
            avatarStyle: card?.avatarStyle ?? "noun",
            avatarSeed: card?.avatarSeed ?? me.username,
            avatarGender: card?.avatarGender,
          });
        }
      } catch {
        /* local card still works */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not bind passkey");
    } finally {
      setBusy("");
    }
  }

  async function verifySelf() {
    if (!user) return;
    setBusy("self");
    setError("");
    try {
      const res = await fetch("/api/self/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: user.id }),
      });
      const data = (await res.json()) as {
        sessionId?: string;
        verificationUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.sessionId || !data.verificationUrl) {
        throw new Error(data.error ?? "Could not start Self");
      }
      saveSelfProof({ sessionId: data.sessionId, status: "pending" });
      window.location.href = data.verificationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Self");
      setBusy("");
    }
  }

  async function checkGoodDollar(nextAddress = address) {
    setBusy("gd");
    setError("");
    try {
      const res = await fetch(
        `/api/gooddollar/status?address=${encodeURIComponent(nextAddress)}`,
      );
      const data = (await res.json()) as {
        address?: string;
        isWhitelisted?: boolean;
        root?: string;
        error?: string;
      };
      if (!res.ok || !data.address) {
        throw new Error(data.error ?? "Could not check GoodDollar");
      }
      saveGoodDollarProof({
        address: data.address,
        isWhitelisted: Boolean(data.isWhitelisted),
        root: data.root ?? "",
        verifiedAt: data.isWhitelisted ? new Date().toISOString() : undefined,
      });
      if (!data.isWhitelisted) {
        setError(
          "This wallet is not a unique GoodDollar human yet. Verify, then check again.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "GoodDollar check failed");
    } finally {
      setBusy("");
    }
  }

  async function verifyGoodDollar() {
    setBusy("gd");
    setError("");
    try {
      const { address: next, url } = await startGoodDollarFace(
        `${window.location.origin}/app/mint?gd=1`,
      );
      setAddress(next);
      window.location.href = url;
    } catch {
      window.open(GOODDOLLAR_WALLET, "_blank", "noreferrer");
      setBusy("");
    }
  }

  function mint(platform: "apple" | "google" | "samsung") {
    setError("");
    try {
      mintCardToWallet(platform);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mint");
    }
  }

  if (!user || !card) return null;

  return (
    <main className="relative px-5 pt-8 pb-8">
      <p className="font-[family-name:var(--font-mark)] text-sm uppercase tracking-[0.2em] text-violet">
        Proof of pass
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase leading-none">
        Mint card to wallet
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink/65">
        This card is a passkey wallet. The passkey signs. There is no seed. The
        private key stays in Apple, Google, or Samsung. Add the pass to your
        phone wallet, then tap a site or a terminal.
      </p>

      {wallet ? (
        <p className="mt-4 border-[3px] border-ink bg-mist px-4 py-3 font-mono text-sm">
          {spendAddress(wallet)}
        </p>
      ) : (
        <button
          type="button"
          disabled={busy === "passkey"}
          onClick={bindPasskey}
          className="btn btn-fill pressable mt-4 w-full"
        >
          {busy === "passkey" ? "Waiting for passkey…" : "Bind passkey wallet"}
        </button>
      )}

      <div className="mt-6">
        <VexoCardFace
          card={card}
          username={user.username}
          walletAddress={wallet ? shortenAddress(wallet.address) : undefined}
        />
      </div>

      <section className="mt-8 grid gap-3">
        <article className="border-[3px] border-ink bg-mist p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-mark)] text-xs uppercase tracking-[0.16em] text-violet">
                Self
              </p>
              <h2 className="mt-1 font-semibold">Disclose your ID</h2>
              <p className="mt-1 text-sm text-ink/60">
                Pre-KYC on Self. The proof can reveal name, ID number, date of
                birth, gender, nationality, expiry, and issuing state. Those
                fields fill this pass.
              </p>
            </div>
            <StatusPill
              ok={selfOk}
              pending={user.humanity?.self?.status === "pending"}
            />
          </div>
          <button
            type="button"
            disabled={busy === "self" || selfOk}
            onClick={() =>
              user.humanity?.self?.status === "pending" && sessionId
                ? pollSelf(sessionId)
                : verifySelf()
            }
            className="btn btn-fill pressable mt-4 w-full"
          >
            {selfOk
              ? "Self verified"
              : busy === "self"
                ? "Opening Self…"
                : user.humanity?.self?.status === "pending"
                  ? "Check Self"
                  : "Verify with Self"}
          </button>
          <DisclosureList disclosures={user.humanity?.self?.disclosures} />
        </article>

        <article className="border-[3px] border-ink bg-mist p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-mark)] text-xs uppercase tracking-[0.16em] text-violet">
                GoodDollar
              </p>
              <h2 className="mt-1 font-semibold">Prove you are unique</h2>
              <p className="mt-1 text-sm text-ink/60">
                Face verification on your wallet. Claim free UBI (G$) and free
                gas. We save the public root, not your face.
              </p>
            </div>
            <StatusPill ok={gdOk} />
          </div>
          <label className="mt-4 block space-y-1 text-sm">
            Celo address on this device
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x…"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy === "gd"}
              onClick={verifyGoodDollar}
              className="btn btn-fill pressable w-full text-sm"
            >
              {busy === "gd" ? "Opening…" : "Verify"}
            </button>
            <button
              type="button"
              disabled={busy === "gd" || !address}
              onClick={() => checkGoodDollar()}
              className="btn btn-ghost pressable w-full text-sm"
            >
              Check wallet
            </button>
          </div>
          <a
            href={GOODDOLLAR_CLAIM}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-center text-xs text-violet"
          >
            Claim UBI and free gas
          </a>
        </article>
      </section>

      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold uppercase">
          Add to a wallet
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          The passkey already is the wallet. Mint puts this card in Apple,
          Google, or Samsung Wallet.
        </p>
        <div className="mt-4 grid gap-2">
          <MintButton
            label="Mint card to Apple Wallet"
            icon={<Apple size={16} />}
            done={Boolean(user.walletMints?.apple)}
            locked={!passReady}
            onClick={() => mint("apple")}
          />
          <MintButton
            label="Mint card to Google Wallet"
            icon={<Wallet size={16} />}
            done={Boolean(user.walletMints?.google)}
            locked={!passReady}
            onClick={() => mint("google")}
          />
          <MintButton
            label="Mint card to Samsung Pass"
            icon={<Smartphone size={16} />}
            done={Boolean(user.walletMints?.samsung)}
            locked={!passReady}
            onClick={() => mint("samsung")}
          />
        </div>
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="mt-4 w-full text-sm text-ink/50"
        >
          Back to your card
        </button>
      </section>
    </main>
  );
}

function DisclosureList({
  disclosures,
}: {
  disclosures?: {
    name?: string;
    idNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    expiryDate?: string;
    issuingState?: string;
  };
}) {
  const rows = [
    ["Name", disclosures?.name],
    ["ID number", disclosures?.idNumber],
    ["Date of birth", disclosures?.dateOfBirth],
    ["Gender", disclosures?.gender],
    ["Nationality", disclosures?.nationality],
    ["Expiry", disclosures?.expiryDate],
    ["Issuing state", disclosures?.issuingState],
  ].filter(([, value]) => Boolean(value));

  if (rows.length === 0) return null;

  return (
    <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-ink/50">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusPill({ ok, pending }: { ok: boolean; pending?: boolean }) {
  const label = ok ? "Verified" : pending ? "Pending" : "Open";
  return (
    <span className="shrink-0 border-[3px] border-ink px-2 py-1 text-[10px] uppercase tracking-wide">
      {label}
    </span>
  );
}

function MintButton({
  label,
  icon,
  done,
  locked,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  done: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked || done}
      onClick={onClick}
      className="btn btn-fill pressable w-full disabled:opacity-40"
    >
      {icon}
      {done ? "On this device" : locked ? "Bind a passkey first" : label}
    </button>
  );
}
