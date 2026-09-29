"use client";

import Link from "next/link";
import { currentUser, peerOf, threadForMeet } from "@/lib/store";
import { useVexo } from "@/lib/use-vexo";
import { dicebearUrl } from "@/lib/dicebear";

export default function MessagesIndexPage() {
  const state = useVexo();
  const me = currentUser();
  if (!me) return null;

  const threads = state.threads.filter((t) => t.memberIds.includes(me.id));

  return (
    <main className="relative px-5 pt-8">
      <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
        After the meet
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Private conversation
      </h1>
      {threads.length === 0 ? (
        <p className="mt-8 border-[3px] border-dashed border-ink bg-mist p-5 text-sm leading-6">
          Chat opens from a Proof of Meet, not from a follow. Mint a connection
          first.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {threads.map((thread) => {
            const meet = state.proofs.find((p) => p.id === thread.meetId);
            if (!meet) return null;
            const { peer, card } = peerOf(meet, me.id);
            if (!peer || !card) return null;
            return (
              <li key={thread.id}>
                <Link
                  href={`/app/messages/${thread.id}`}
                  className="flex items-center gap-3 border-[3px] border-ink bg-mist p-4"
                >
                  <img
                    src={dicebearUrl(card.avatarStyle, card.avatarSeed, 64)}
                    alt=""
                    className="h-11 w-11"
                  />
                  <div>
                    <p className="font-medium">{peer.displayName}</p>
                    <p className="text-xs text-ink/50">Private · continues from the meet</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
