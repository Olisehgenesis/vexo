"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, Menu } from "lucide-react";
import { BrickMark, SiteDoodle } from "@/components/doodle-field";
import { MeetOrbit } from "@/components/meet-orbit";
import { useIdentity } from "@/lib/identity";
import { currentUser } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const identity = useIdentity();

  async function enter() {
    await identity.login();
    if (currentUser()) router.push("/app");
    else router.push("/onboarding");
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
            onClick={enter}
            className="btn btn-menu pressable mb-2"
          >
            Menu
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
            Only real humans. We do not store your data. Your profile, keys, and
            pass live on this device. Mint it into Apple Wallet, Google Wallet,
            or Samsung Pass — then tap a site or a terminal.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={enter}
              className="btn btn-fill pressable"
            >
              Create your card
            </button>
            <a href="#human" className="btn btn-ghost pressable">
              How we know you are human
            </a>
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
          After the card is created, mint it to a wallet. It can open a website,
          a physical terminal, and hold ETH and USD — still on your device.
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
              Verify with Self, GoodDollar, or both. Self unlocks the pass.
              GoodDollar unlocks UBI and gas. Chat is later.
            </p>
          </div>
          <button
            type="button"
            onClick={enter}
            className="btn btn-fill pressable mt-10 self-start"
          >
            Create your card
          </button>
        </article>
      </section>
    </div>
  );
}
