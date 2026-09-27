"use client";

import { useState } from "react";
import { Copy, Plus, Share2 } from "lucide-react";
import { VexoCardFace } from "@/components/vexo-card";
import {
  cardsFor,
  currentUser,
  primaryCard,
  signOut,
} from "@/lib/store";
import { shortenAddress, spendAddress } from "@/lib/passkey-wallet";
import { useVexo } from "@/lib/use-vexo";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CardHomePage() {
  useVexo();
  const router = useRouter();
  const user = currentUser();
  const card = user ? primaryCard(user.id) : null;
  const extras = user ? cardsFor(user.id).filter((c) => !c.isPrimary) : [];
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user || !card) return null;

  const path = `/${user.username}`;

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      await navigator.share({
        title: `${card!.displayName} · Vexo`,
        text: "Meet me on Vexo",
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="relative px-5 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
            Your pass
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            Living identity
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut();
            router.push("/");
          }}
          className="text-xs text-ink/50"
        >
          Sign out
        </button>
      </header>

      <VexoCardFace
        card={card}
        username={user.username}
        walletAddress={
          user.passkeyWallet
            ? shortenAddress(spendAddress(user.passkeyWallet))
            : undefined
        }
        flipped={flipped}
        onToggle={() => setFlipped((v) => !v)}
      />
      <p className="mt-3 text-center font-[family-name:var(--font-mark)] text-lg text-violet">
        Tap the card to flip the pass
      </p>

      {card.bio ? (
        <p className="mt-6 text-sm leading-6 text-ink/70">{card.bio}</p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/app/mint" className="btn btn-fill pressable w-full">
          Mint pass
        </Link>
        <Link href="/app/send" className="btn btn-ghost pressable w-full">
          Send ETH
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={share}
          className="btn btn-fill pressable w-full"
        >
          <Share2 size={16} />
          {copied ? "Copied" : "Share"}
        </button>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}${path}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="btn btn-ghost pressable w-full"
        >
          <Copy size={16} />
          Copy link
        </button>
      </div>

      <Link
        href="/app/edit"
        className="btn btn-ghost pressable mt-3 w-full border-dashed"
      >
        Update living card
      </Link>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">More cards</h2>
          <Link href="/app/cards/new" className="flex items-center gap-1 text-xs text-violet">
            <Plus size={14} /> New
          </Link>
        </div>
        {extras.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-violet/30 bg-white/70 p-4 text-sm text-ink/60">
            One identity, many cards. Add a business, creator, or event card
            when you need a different surface.
          </p>
        ) : (
          <ul className="space-y-2">
            {extras.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl bg-white/80 px-4 py-3 text-sm"
              >
                <p className="font-medium">{item.displayName}</p>
                <p className="text-xs text-ink/50">
                  /{user.username}/{item.slug}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
