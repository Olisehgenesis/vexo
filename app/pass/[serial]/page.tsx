"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { WalletPassBack } from "@/components/wallet-pass-back";
import type { WalletPassPayload } from "@/lib/wallet-pass";

export default function PublicPassPage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = use(params);
  const [pass, setPass] = useState<WalletPassPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/passes/${encodeURIComponent(serial)}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          pass?: WalletPassPayload;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.pass) {
          setError(data.error ?? "Pass not found");
          return;
        }
        setPass(data.pass);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this pass.");
      });
    return () => {
      cancelled = true;
    };
  }, [serial]);

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <p className="font-[family-name:var(--font-mark)] text-[10px] text-orchid">
        Vexo pass
      </p>
      {pass ? (
        <div className="mt-6">
          <WalletPassBack pass={pass} />
        </div>
      ) : (
        <>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl">
            Serial {serial}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {error || "Loading pass…"}
          </p>
        </>
      )}
      <Link href="/app/mint" className="btn btn-fill pressable mt-6 inline-flex">
        Back to mint
      </Link>
    </main>
  );
}
