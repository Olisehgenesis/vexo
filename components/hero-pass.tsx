import { dicebearUrl } from "@/lib/dicebear";

const pixels: { l: string; t: string; s: number; c: string; r?: number }[] = [
  { l: "62%", t: "58%", s: 28, c: "#6d28d9" },
  { l: "70%", t: "52%", s: 22, c: "#a855f7" },
  { l: "76%", t: "62%", s: 18, c: "#7c3aed" },
  { l: "58%", t: "68%", s: 20, c: "#c084fc" },
  { l: "82%", t: "48%", s: 14, c: "#f0abfc" },
  { l: "84%", t: "68%", s: 24, c: "#5b21b6" },
  { l: "72%", t: "74%", s: 16, c: "#d8b4fe" },
  { l: "90%", t: "58%", s: 12, c: "#e879f9" },
  { l: "66%", t: "80%", s: 14, c: "#a855f7" },
  { l: "80%", t: "80%", s: 10, c: "#6d28d9" },
  { l: "92%", t: "72%", s: 16, c: "#c4b5fd" },
  { l: "54%", t: "78%", s: 11, c: "#f5d0fe" },
  { l: "88%", t: "42%", s: 9, c: "#7c3aed" },
  { l: "96%", t: "64%", s: 8, c: "#a855f7" },
];

export function HeroPass() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[560px] lg:h-[500px]">
      <div className="absolute right-[8%] top-[10%] h-28 w-28 rounded-[28px] bg-lilac/45" />
      <div className="absolute bottom-[22%] left-[2%] h-16 w-16 rounded-2xl bg-blush/35" />
      <div className="absolute inset-[6%] rounded-full border border-dashed border-violet/20" />

      {pixels.map((p) => (
        <span
          key={`${p.l}${p.t}${p.s}`}
          className="absolute"
          style={{
            left: p.l,
            top: p.t,
            width: p.s,
            height: p.s,
            background: p.c,
            borderRadius: 3,
          }}
        />
      ))}

      <article className="hero-pass absolute left-[4%] top-[18%] w-[74%] overflow-hidden rounded-[26px] p-5 text-white shadow-[0_50px_90px_-32px_rgba(76,29,149,0.75)]">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
          viewBox="0 0 420 240"
          aria-hidden
        >
          <path
            d="M-20 44c90-24 150 30 240 4 90-24 150 18 220-10"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M20 200c120 24 170-40 300 8"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between">
            <p className="font-[family-name:var(--font-mark)] text-xl text-blush">Vexo</p>
            <img
              src={dicebearUrl("dylan", "oliseh-genesis", 128)}
              alt=""
              className="h-10 w-10 rounded-xl bg-white/20 ring-2 ring-white/30"
            />
          </div>
          <div className="mt-auto">
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none tracking-tight">
              Oliseh Genesis
            </p>
            <p className="mt-1 text-xs text-white/80">Web3 builder</p>
            <p className="mt-3 font-[family-name:var(--font-mark)] text-base text-blush">
              vexo.social/oliseh
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
