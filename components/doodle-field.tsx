export function BrickMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 24"
      fill="none"
      aria-hidden
    >
      <rect x="2" y="8" width="18" height="14" className="doodle-stroke" />
      <rect x="22" y="8" width="18" height="14" className="doodle-stroke" />
      <rect x="16" y="2" width="10" height="8" className="doodle-stroke" />
      <rect x="8" y="12" width="6" height="6" fill="var(--paper)" />
      <rect x="28" y="12" width="6" height="6" fill="var(--paper)" />
    </svg>
  );
}

export function SiteDoodle() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      viewBox="0 0 1440 900"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path d="M70 80h28v20H70zM98 80h28v20H98zM84 52h28v28H84z" className="doodle-stroke" />
      <path d="M1280 110h28v20h-28zM1308 110h28v20h-28zM1294 82h28v28h-28z" className="doodle-stroke" />
      <path d="M80 620h22v16H80zM102 620h22v16h-22zM91 598h22v22H91z" className="doodle-stroke" />
    </svg>
  );
}

export function DoodleField() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
      viewBox="0 0 390 844"
      fill="none"
      aria-hidden
    >
      <path d="M18 40h16v12H18zM34 40h16v12H34zM26 22h16v18H26z" className="doodle-stroke" />
      <path d="M320 70h16v12h-16zM336 70h16v12h-16zM328 52h16v18h-16z" className="doodle-stroke" />
      <path d="M24 760h16v12H24zM40 760h16v12H40zM32 742h16v18H32z" className="doodle-stroke" />
    </svg>
  );
}
