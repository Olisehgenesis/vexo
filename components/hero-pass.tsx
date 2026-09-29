import { dicebearUrl } from "@/lib/dicebear";

const pixels: { l: string; t: string; s: number; c: string }[] = [
  { l: "62%", t: "58%", s: 28, c: "#e23d4f" },
  { l: "70%", t: "52%", s: 22, c: "#ffd36a" },
  { l: "76%", t: "62%", s: 18, c: "#4aa3ff" },
  { l: "58%", t: "68%", s: 20, c: "#ff8a5b" },
  { l: "82%", t: "48%", s: 14, c: "#e23d4f" },
  { l: "84%", t: "68%", s: 24, c: "#2a2148" },
  { l: "72%", t: "74%", s: 16, c: "#ffd36a" },
  { l: "90%", t: "58%", s: 12, c: "#4aa3ff" },
  { l: "66%", t: "80%", s: 14, c: "#e23d4f" },
  { l: "80%", t: "80%", s: 10, c: "#fff4dc" },
];

export function HeroPass() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[560px] lg:h-[500px]">
      <div className="absolute right-[8%] top-[10%] h-28 w-28 bg-lilac/45" />
      <div className="absolute bottom-[22%] left-[2%] h-16 w-16 bg-blush/35" />
      <div className="absolute inset-[6%] border-[3px] border-dashed border-ink/25" />

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
          }}
        />
      ))}

      <article className="hero-pass absolute left-[4%] top-[18%] w-[74%] overflow-hidden p-5 text-ink">
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between">
            <p className="font-[family-name:var(--font-mark)] text-[10px] leading-relaxed text-orchid">
              Vexo
            </p>
            <img
              src={dicebearUrl("noun", "oliseh-genesis", 128)}
              alt=""
              className="h-10 w-10 border-[3px] border-ink bg-mist"
            />
          </div>
          <div className="mt-auto">
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none tracking-tight">
              Oliseh Genesis
            </p>
            <p className="mt-1 text-xs text-ink/80">Web3 builder</p>
            <p className="mt-3 font-[family-name:var(--font-mark)] text-[10px] leading-relaxed text-lilac">
              vexo.social/oliseh
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
