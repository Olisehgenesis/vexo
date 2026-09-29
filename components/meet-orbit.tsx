import { dicebearUrl } from "@/lib/dicebear";

const coins = [
  { cx: 200, cy: 118, r: 42, seed: "oliseh", rot: -6 },
  { cx: 90, cy: 210, r: 38, seed: "sarah", rot: 4 },
  { cx: 310, cy: 200, r: 40, seed: "brian", rot: -4 },
  { cx: 140, cy: 330, r: 36, seed: "meet", rot: 8 },
  { cx: 270, cy: 328, r: 34, seed: "nile", rot: -8 },
  { cx: 205, cy: 248, r: 32, seed: "vexo", rot: 2 },
];

export function MeetOrbit() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <svg viewBox="0 0 400 420" className="h-auto w-full" aria-hidden>
        <rect
          x="40"
          y="206"
          width="320"
          height="88"
          fill="none"
          stroke="#fff4dc"
          strokeWidth="2"
          opacity="0.35"
        />
        <rect
          x="82"
          y="218"
          width="236"
          height="64"
          fill="none"
          stroke="#fff4dc"
          strokeWidth="2"
          opacity="0.35"
        />
      </svg>
      {coins.map((coin) => (
        <div
          key={coin.seed}
          className="absolute grid place-items-center border-[3px] border-ink bg-panel shadow-[4px_4px_0_var(--color-violet)]"
          style={{
            width: coin.r * 2,
            height: coin.r * 2,
            left: `calc(${(coin.cx / 400) * 100}% - ${coin.r}px)`,
            top: `calc(${(coin.cy / 420) * 100}% - ${coin.r}px)`,
            transform: `rotate(${coin.rot}deg)`,
          }}
        >
          <img
            src={dicebearUrl("noun", coin.seed, 80)}
            alt=""
            className="h-full w-full"
          />
        </div>
      ))}
    </div>
  );
}
