"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePrimaryCard, currentUser, primaryCard } from "@/lib/store";
import { useVexo } from "@/lib/use-vexo";

export default function EditCardPage() {
  useVexo();
  const router = useRouter();
  const user = currentUser();
  const card = user ? primaryCard(user.id) : null;
  const [displayName, setDisplayName] = useState(card?.displayName ?? "");
  const [title, setTitle] = useState(card?.title ?? "");
  const [bio, setBio] = useState(card?.bio ?? "");

  if (!card) return null;

  return (
    <main className="relative px-5 pt-8">
      <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
        Living card
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Information can change. The identity stays.
      </h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          updatePrimaryCard({ displayName, title, bio });
          router.push("/app");
        }}
      >
        <label className="space-y-1 text-sm">
          Name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Bio
          <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <button
          type="submit"
          className="btn btn-fill pressable w-full"
        >
          Save updates
        </button>
      </form>
    </main>
  );
}
