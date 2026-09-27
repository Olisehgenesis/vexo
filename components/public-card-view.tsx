"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoodleField } from "@/components/doodle-field";
import { VexoCardFace } from "@/components/vexo-card";
import { dicebearUrl } from "@/lib/dicebear";
import {
  cardByPath,
  currentUser,
  mintMeet,
  threadForMeet,
  userByUsername,
} from "@/lib/store";
import { useVexo } from "@/lib/use-vexo";

export function PublicCardView({
  username,
  slug,
}: {
  username: string;
  slug?: string;
}) {
  const state = useVexo();
  const router = useRouter();
  const owner = userByUsername(username);
  const card = cardByPath(username, slug);
  const me = currentUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const already = me
    ? state.proofs.find(
        (p) =>
          (p.aUserId === me.id && p.bUserId === owner?.id) ||
          (p.bUserId === me.id && p.aUserId === owner?.id),
      )
    : null;

  async function connect() {
    if (!owner || !card) return;
    if (!me) {
      router.push("/");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const proof = await mintMeet({
        peerUserId: owner.id,
        peerCardId: card.id,
        eventName: owner.username === "sarah" ? "ETH Nile 2026" : "In person",
        place: card.location,
      });
      const thread = threadForMeet(proof.id);
      if (thread) router.push(`/app/meets`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mint meet");
    } finally {
      setBusy(false);
    }
  }

  if (!owner || !card) {
    return (
      <div className="phone-shell grid place-items-center px-6">
        <p>No Vexo card at this path.</p>
      </div>
    );
  }

  return (
    <div className="phone-shell">
      <DoodleField />
      <main className="relative px-5 pb-12 pt-10">
        <Link href="/" className="font-[family-name:var(--font-mark)] text-xl text-orchid">
          Vexo Social
        </Link>
        <div className="mt-6">
          <VexoCardFace card={card} username={owner.username} />
        </div>
        {card.bio ? (
          <p className="mt-5 text-sm leading-6 text-ink/75">{card.bio}</p>
        ) : null}
        {card.location ? (
          <p className="mt-2 text-xs uppercase tracking-wide text-ink/45">
            {card.location}
          </p>
        ) : null}

        <ul className="mt-5 space-y-2">
          {card.links.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                className="block rounded-2xl bg-white/80 px-4 py-3 text-sm"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {me?.id === owner.id ? (
          <Link
            href="/app"
            className="btn btn-fill mt-6 w-full"
          >
            This is your card
          </Link>
        ) : already ? (
          <div className="mt-6 rounded-3xl bg-white/80 p-4">
            <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
              Proof of Meet ✓
            </p>
            <p className="text-sm">
              {already.eventName ?? "You already minted this connection."}
            </p>
            <Link
              href="/app/messages"
              className="btn btn-fill mt-3"
            >
              Message
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="btn btn-fill pressable mt-6 w-full"
          >
            <img
              src={dicebearUrl(card.avatarStyle, card.avatarSeed, 40)}
              alt=""
              className="h-6 w-6 rounded-full"
            />
            {busy ? "Minting…" : "Mint Proof of Meet"}
          </button>
        )}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </main>
    </div>
  );
}
