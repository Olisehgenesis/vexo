"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { decryptMessage, encryptMessage, randomId } from "@/lib/crypto";
import {
  currentUser,
  getState,
  messagesFor,
  peerOf,
  pushMessage,
  threadById,
  wrappingSecret,
} from "@/lib/store";
import { useVexo } from "@/lib/use-vexo";

export default function ThreadPage() {
  const state = useVexo();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const me = currentUser();
  const thread = threadById(params.id);
  const [text, setText] = useState("");
  const [plain, setPlain] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const meet = thread
    ? getState().proofs.find((p) => p.id === thread.meetId)
    : null;
  const peerBundle = me && meet ? peerOf(meet, me.id) : { peer: undefined };

  useEffect(() => {
    if (!me || !thread || !peerBundle.peer) return;
    const secret = wrappingSecret();
    const list = messagesFor(thread.id);
    let cancelled = false;
    Promise.all(
      list.map(async (message) => {
        try {
          const body = await decryptMessage(
            secret,
            me.vault,
            peerBundle.peer!.vault.publicKey,
            message.ciphertext,
            message.iv,
          );
          return [message.id, body] as const;
        } catch {
          return [message.id, "Unable to decrypt"] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setPlain(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [me, thread, peerBundle.peer, state.messages.length]);

  if (!me || !thread || !meet || !peerBundle.peer) {
    return (
      <main className="px-5 pt-10">
        <p>This thread needs a Proof of Meet.</p>
      </main>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !me || !peerBundle.peer || !thread) return;
    setSending(true);
    try {
      const packed = await encryptMessage(
        wrappingSecret(),
        me.vault,
        peerBundle.peer.vault.publicKey,
        text.trim(),
      );
      pushMessage({
        id: randomId(12),
        threadId: thread.id,
        fromUserId: me.id,
        ciphertext: packed.ciphertext,
        iv: packed.iv,
        createdAt: new Date().toISOString(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  }

  const list = messagesFor(thread.id);

  return (
    <main className="relative flex min-h-[calc(100dvh-6rem)] flex-col px-5 pt-6">
      <button type="button" onClick={() => router.push("/app/messages")} className="text-xs text-violet">
        ← Messages
      </button>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
        {peerBundle.peer.displayName}
      </h1>
      <p className="font-[family-name:var(--font-mark)] text-orchid">
        Continues from Proof of Meet
      </p>

      <ul className="mt-4 flex-1 space-y-2 overflow-y-auto pb-4">
        {list.length === 0 ? (
          <li className="text-sm text-ink/55">
            Say hello. This stays between the two of you.
          </li>
        ) : (
          list.map((message) => {
            const mine = message.fromUserId === me.id;
            return (
              <li
                key={message.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "ml-auto bg-violet text-white"
                    : "bg-white text-ink"
                }`}
              >
                {plain[message.id] ?? "…"}
              </li>
            );
          })
        )}
      </ul>

      <form onSubmit={send} className="flex gap-2 pb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write privately"
        />
        <button
          type="submit"
          disabled={sending}
          className="btn btn-fill pressable"
        >
          Send
        </button>
      </form>
    </main>
  );
}
