"use client";

import { QRCodeSVG } from "qrcode.react";
import { dicebearUrl } from "@/lib/dicebear";
import type { VexoCard } from "@/lib/types";

const kindLabel: Record<VexoCard["kind"], string> = {
  personal: "Personal",
  business: "Business",
  creator: "Creator",
  event: "Event",
  community: "Community",
  professional: "Professional",
  custom: "Custom",
};

export function VexoCardFace({
  card,
  username,
  walletAddress,
  flipped,
  onToggle,
}: {
  card: VexoCard;
  username: string;
  walletAddress?: string;
  flipped?: boolean;
  onToggle?: () => void;
}) {
  const url =
    typeof window === "undefined"
      ? `https://vexo.social/${username}`
      : `${window.location.origin}/${username}${card.isPrimary ? "" : `/${card.slug}`}`;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="pressable w-full text-left [perspective:1200px]"
    >
      <div
        className="relative min-h-[232px] w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <article className="absolute inset-0 overflow-hidden border-[3px] border-ink bg-panel p-5 text-ink shadow-[6px_6px_0_var(--color-violet)] [backface-visibility:hidden]">
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-mark)] text-[10px] uppercase leading-relaxed tracking-[0.16em] text-orchid">
                Vexo
              </p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-ink/50">
                {kindLabel[card.kind]} card
              </p>
            </div>
            <img
              src={dicebearUrl(
                card.avatarStyle,
                card.avatarSeed,
                96,
                card.avatarGender ?? "unspecified",
              )}
              alt=""
              className="h-14 w-14 border-[3px] border-ink bg-mist"
            />
          </div>
          <div className="relative mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-[28px] font-extrabold uppercase leading-none tracking-tight">
              {card.displayName}
            </h2>
            {card.title ? (
              <p className="mt-2 text-sm text-ink/70">{card.title}</p>
            ) : null}
            <p className="mt-5 font-[family-name:var(--font-mark)] text-[10px] uppercase leading-relaxed tracking-wide text-lilac">
              vexo.social/{username}
              {!card.isPrimary && `/${card.slug}`}
            </p>
            {walletAddress ? (
              <p className="mt-2 font-mono text-[11px] tracking-wide text-ink/55">
                {walletAddress}
              </p>
            ) : null}
          </div>
        </article>

        <article className="absolute inset-0 flex flex-col items-center justify-center gap-3 border-[3px] border-ink bg-ink p-5 text-paper [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="border-[3px] border-paper bg-paper p-3">
            <QRCodeSVG value={url} size={132} fgColor="#1b1430" bgColor="#fff4dc" />
          </div>
          <p className="font-[family-name:var(--font-mark)] text-[10px] uppercase leading-relaxed tracking-[0.16em]">
            Scan to meet
          </p>
        </article>
      </div>
    </button>
  );
}
