"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, Fingerprint, Menu } from "lucide-react";
import { BrickMark, SiteDoodle } from "@/components/doodle-field";
import { MeetOrbit } from "@/components/meet-orbit";
import { passkeyErrorMessage, signInWithDevicePasskey } from "@/lib/passkey-auth";
import { currentUser } from "@/lib/store";
import { useVexo } from "@/lib/use-vexo";

export default function HomePage() {
  useVexo();
  const router = useRouter();
  const user = currentUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      await signInWithDevicePasskey();
      router.push("/app");
    } catch (err) {
      setError(passkeyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper p-3 md:p-5">
      <div className="relative min-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[28px] border border-ink/10 bg-panel md:min-h-[calc(100dvh-2.5rem)]">
        <SiteDoodle />

        <header className="relative z-10 flex items-end justify-between gap-4 px-5 pt-5 md:px-8">
          <p className="mb-3 flex items-center gap-2 font-[family-name:var(--font-mark)] text-xl uppercase tracking-[0.14em]">
            <BrickMark className="h-6 w-9" />
            Vexo
          </p>
          <nav className="hidden flex-1 items-end justify-center md:flex">
            {[
              { href: "#pass", label: "Pass", active: true },
              { href: "#human", label: "Human", active: false },
              { href: "#wallet", label: "Wallet", active: false },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                data-active={item.active}
                className="folder-tab -ml-2 first:ml-0"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => (user ? router.push("/app") : void signIn())}
            className="btn btn-menu pressable mb-2"
          >
            {user ? "Card" : "Sign in"}
            <Menu size={15} strokeWidth={2.4} />
          </button>
        </header>

        <section className="relative z-10 mx-auto max-w-3xl px-6 pb-4 pt-10 text-center md:pt-14">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
            Proof of pass
            <span className="text-ink/40">On your device</span>
            <ArrowRight size={12} />
          </p>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.4rem,7vw,4.6rem)] font-extrabold uppercase leading-[0.92] tracking-tight">
            Vexo.
            <br />
            Proof of pass.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-ink/70 md:text-base">
            Only real humans. Sign in with the same Face ID passkey that owns
            the card in Apple Wallet, Google Wallet, or Samsung Pass. The ETH
            address is derived from that key. We do not keep an account
            database.
          </p>
          {error ? (
            <p className="mx-auto mt-4 max-w-md text-sm text-rose-700">{error}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => router.push("/app")}
                className="btn btn-fill pressable"
              >
                Open your card
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signIn()}
                  className="btn btn-fill pressable"
                >
                  <Fingerprint size={16} />
                  {busy ? "Waiting for Face ID…" : "Sign in with passkey"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding")}
                  className="btn btn-ghost pressable"
                >
                  Create your card
                </button>
              </>
            )}
          </div>
        </section>

        <div className="relative z-10 px-4 pb-16 pt-4">
          <MeetOrbit />
        </div>

        <div className="relative z-10 flex items-center justify-between px-6 pb-5">
          <a
            href="#human"
            className="flex items-center gap-2 font-[family-name:var(--font-mark)] text-sm uppercase tracking-[0.18em]"
          >
            <ArrowDown size={14} />
            Scroll down
          </a>
        </div>
        <div className="hatch h-8 border-t border-ink/10" />
      </div>

      <section
        id="human"
        className="mx-auto grid max-w-5xl gap-4 px-4 py-16 md:grid-cols-2"
      >
        <article className="rounded-2xl border border-ink/10 bg-panel p-8">
          <p className="font-[family-name:var(--font-mark)] text-sm uppercase tracking-[0.2em] text-violet">
            Self
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
            Disclose the ID. Fill the pass.
          </h2>
          <p className="mt-4 text-sm leading-6 text-ink/60">
            Self Pre-KYC can reveal name, ID number, date of birth, gender,
            nationality, expiry, and issuing state. Those fields become the
            living pass.
          </p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-panel p-8">
          <p className="font-[family-name:var(--font-mark)] text-sm uppercase tracking-[0.2em] text-violet">
            GoodDollar
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
            Prove you are unique. Claim UBI.
          </h2>
          <p className="mt-4 text-sm leading-6 text-ink/60">
            Face-verify the wallet on this device. Then claim free G$ and free
            gas. We keep the public whitelist root, never the face.
          </p>
        </article>
      </section>

      <section
        id="pass"
        className="mx-auto max-w-5xl px-4 pb-10 text-center"
      >
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase md:text-4xl">
          One pass. Your profile.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink/65">
            After the card is created, mint it to a wallet. The passkey in
            Face ID is the same key that unlocks Apple, Google, or Samsung
            Wallet — and the same key that signs ETH.
        </p>
      </section>

      <section
        id="wallet"
        className="mx-auto max-w-5xl px-4 pb-20"
      >
        <article className="flex flex-col justify-between rounded-2xl border border-ink/10 bg-panel p-8">
          <div>
            <p className="font-[family-name:var(--font-mark)] text-sm uppercase tracking-[0.2em] text-violet">
              On device
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
              We do not store your data.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-ink/60">
              Sign in is Face ID on your passkey. The Kernel address is computed
              from that key. The living card lives on the device and in the
              wallet app. Verify with Self, GoodDollar, or both when you want
              the pass filled and UBI.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              user ? router.push("/app") : router.push("/onboarding")
            }
            className="btn btn-fill pressable mt-10 self-start"
          >
            {user ? "Open your card" : "Create your card"}
          </button>
        </article>
      </section>
    </div>
  );
}
