"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  currentUser,
  primaryCard,
  savePasskeyBiodata,
  updatePrimaryCard,
} from "@/lib/store";
import { parseExtraJson } from "@/lib/passkey-vault";
import { sealCardToPasskey } from "@/lib/passkey-wallet";
import { useVexo } from "@/lib/use-vexo";

export default function EditCardPage() {
  useVexo();
  const router = useRouter();
  const user = currentUser();
  const card = user ? primaryCard(user.id) : null;
  const [displayName, setDisplayName] = useState(
    user?.passkeyBiodata?.name ?? card?.displayName ?? "",
  );
  const [title, setTitle] = useState(card?.title ?? "");
  const [bio, setBio] = useState(card?.bio ?? "");
  const [extraRaw, setExtraRaw] = useState(
    JSON.stringify(user?.passkeyBiodata?.extra ?? {}, null, 2),
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  if (!card) return null;

  async function save(writePasskey: boolean) {
    setBusy(true);
    setNote("");
    try {
      const extra = parseExtraJson(extraRaw);
      updatePrimaryCard({ displayName, title, bio });
      const vault = savePasskeyBiodata(displayName, extra);
      if (writePasskey && vault) {
        await sealCardToPasskey(vault);
        setNote("On this device, and on the passkey. No server write.");
      } else {
        setNote("On this device. Passkey still has the last blob that succeeded.");
      }
      router.push("/app");
    } catch (err) {
      setNote(
        err instanceof Error
          ? err.message
          : "Device copy is kept. The passkey blob was not replaced.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative px-5 pt-8 pb-10">
      <p className="font-[family-name:var(--font-mark)] text-xl text-orchid">
        Living card
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Information can change. The identity stays.
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink/65">
        Name and a small JSON bag live on this phone first. Updating the
        passkey is a local overwrite of that blob. If that step fails or
        the network is gone, this phone keeps the new copy and the key
        keeps the last successful blob.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
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
        <label className="space-y-1 text-sm">
          Extra on passkey (JSON)
          <textarea
            rows={6}
            value={extraRaw}
            onChange={(e) => setExtraRaw(e.target.value)}
            spellCheck={false}
            className="font-mono text-xs"
          />
        </label>
        <button type="submit" disabled={busy} className="btn btn-ghost pressable w-full">
          {busy ? "Saving…" : "Save on this device"}
        </button>
        <button
          type="button"
          disabled={busy || !user?.passkeyWallet}
          onClick={() => void save(true)}
          className="btn btn-fill pressable w-full"
        >
          {busy ? "Waiting for passkey…" : "Save and write passkey"}
        </button>
        {note ? <p className="text-sm text-ink/60">{note}</p> : null}
      </form>
    </main>
  );
}
