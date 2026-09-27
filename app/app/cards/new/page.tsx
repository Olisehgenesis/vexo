"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dicebearUrl, DICE_STYLES } from "@/lib/dicebear";
import { addCard, currentUser } from "@/lib/store";
import type { CardKind, DiceStyle } from "@/lib/types";

const kinds: CardKind[] = [
  "business",
  "creator",
  "event",
  "community",
  "professional",
  "custom",
];

export default function NewCardPage() {
  const router = useRouter();
  const user = currentUser();
  const [kind, setKind] = useState<CardKind>("business");
  const [slug, setSlug] = useState("business");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarStyle, setAvatarStyle] = useState<DiceStyle>("notionists");
  const [avatarSeed, setAvatarSeed] = useState(user?.username ?? "vexo");

  if (!user) return null;

  return (
    <main className="relative px-5 pt-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Another card, same you
      </h1>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          addCard({
            kind,
            slug,
            displayName: user.displayName,
            title,
            bio,
            avatarStyle,
            avatarSeed,
          });
          router.push("/app/mint");
        }}
      >
        <div className="flex flex-wrap gap-2">
          {kinds.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setKind(item);
                setSlug(item);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize ${
                kind === item
                  ? "border-violet bg-violet text-white"
                  : "border-violet/30 bg-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="space-y-1 text-sm">
          Path
          <input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Founder — Onchain Uganda"
          />
        </label>
        <label className="space-y-1 text-sm">
          Bio
          <textarea required rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {DICE_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setAvatarStyle(style.id)}
              className={`shrink-0 rounded-2xl p-1 ring-2 ${
                avatarStyle === style.id ? "ring-orchid" : "ring-transparent"
              }`}
            >
              <img src={dicebearUrl(style.id, avatarSeed, 56)} alt="" className="h-12 w-12 rounded-xl" />
            </button>
          ))}
        </div>
        <button
          type="submit"
          className="btn btn-fill pressable w-full"
        >
          Add card
        </button>
      </form>
    </main>
  );
}
