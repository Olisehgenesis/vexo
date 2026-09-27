import { dicebearUrl } from "@/lib/dicebear";

const coins = [
  { cx: 200, cy: 118, r: 42, seed: "oliseh", rot: -18 },
  { cx: 90, cy: 210, r: 38, seed: "sarah", rot: 12 },
  { cx: 310, cy: 200, r: 40, seed: "brian", rot: -8 },
  { cx: 140, cy: 330, r: 36, seed: "meet", rot: 20 },
  { cx: 270, cy: 328, r: 34, seed: "nile", rot: -14 },
  { cx: 205, cy: 248, r: 32, seed: "vexo", rot: 6 },
];

export function MeetOrbit() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <svg viewBox="0 0 400 420" className="h-auto w-full" aria-hidden>
        <ellipse
          cx="200"
          cy="250"
          rx="160"
          ry="44"
          fill="none"
          stroke="#16341f"
          strokeWidth="1.2"
          opacity="0.35"
        />
        <ellipse
          cx="200"
          cy="250"
          rx="118"
          ry="32"
          fill="none"
          stroke="#16341f"
          strokeWidth="1.2"
          opacity="0.35"
        />
        <ellipse
          cx="200"
          cy="250"
          rx="72"
          ry="18"
          fill="none"
          stroke="#16341f"
          strokeWidth="1.2"
          opacity="0.35"
        />
        {[0, 45, 90, 135].map((a) => (
          <line
            key={a}
            x1="200"
            y1="250"
            x2={200 + Math.cos((a * Math.PI) / 180) * 160}
            y2={250 + Math.sin((a * Math.PI) / 180) * 44}
            stroke="#16341f"
            strokeWidth="1"
            opacity="0.25"
          />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <circle
            key={i}
            cx={200 + Math.cos((i / 10) * Math.PI * 2) * (40 + i * 8)}
            cy={250 + Math.sin((i / 10) * Math.PI * 2) * (10 + i * 2)}
            r="2.2"
            fill="#1f6b3a"
          />
        ))}
      </svg>
      {coins.map((coin) => (
        <div
          key={coin.seed}
          className="absolute grid place-items-center rounded-full border-[1.5px] border-ink bg-panel shadow-[4px_6px_0_rgba(27,48,34,0.08)]"
          style={{
            width: coin.r * 2,
            height: coin.r * 2,
            left: `calc(${(coin.cx / 400) * 100}% - ${coin.r}px)`,
            top: `calc(${(coin.cy / 420) * 100}% - ${coin.r}px)`,
            transform: `rotate(${coin.rot}deg)`,
          }}
        >
          <img
            src={dicebearUrl("notionists", coin.seed, 80)}
            alt=""
            className="h-[70%] w-[70%] rounded-full"
          />
        </div>
      ))}
    </div>
  );
}
