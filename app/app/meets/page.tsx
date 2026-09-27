"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { dicebearUrl } from "@/lib/dicebear";
import {
  currentUser,
  meetsForCurrentUser,
  peerOf,
  threadForMeet,
} from "@/lib/store";
import { useVexo } from "@/lib/use-vexo";

export default function MeetsPage() {
  useVexo();
  const router = useRouter();
  const me = currentUser();
  const meets = meetsForCurrentUser();

  if (!me) return null;

  return (
    <main className="relative px-5 pt-8">
      <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
        Social memory
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Who you actually met
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        {meets.length} connections · not followers, proofs.
      </p>

      {meets.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-violet/35 bg-white/70 p-5">
          <p className="text-sm leading-6">
            A Proof of Meet is mutual. Open someone&apos;s Vexo card and mint the
            connection — or start with a demo person nearby.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/sarah"
              className="btn btn-fill"
            >
              Meet Sarah
            </Link>
            <Link
              href="/brian"
              className="btn btn-ghost"
            >
              Meet Brian
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {meets.map((meet) => {
            const { peer, card } = peerOf(meet, me.id);
            if (!peer || !card) return null;
            const thread = threadForMeet(meet.id);
            return (
              <li key={meet.id} className="rounded-3xl bg-white/80 p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={dicebearUrl(card.avatarStyle, card.avatarSeed, 72)}
                    alt=""
                    className="h-12 w-12 rounded-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{peer.displayName}</p>
                    <p className="text-xs text-ink/55">
                      {meet.eventName ?? "Met in person"} ·{" "}
                      {new Date(meet.createdAt).toLocaleDateString()}
                    </p>
                    <p className="font-[family-name:var(--font-mark)] text-orchid">
                      Proof of Meet ✓
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/${peer.username}`}
                    className="btn btn-ghost h-8 px-3 text-xs"
                  >
                    View card
                  </Link>
                  {thread ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/app/messages/${thread.id}`)}
                      className="btn btn-fill h-8 px-3 text-xs"
                    >
                      Message
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
