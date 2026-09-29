"use client";

import type { WalletPassPayload } from "@/lib/wallet-pass";

export function WalletPassBack({ pass }: { pass: WalletPassPayload }) {
  return (
    <article className="overflow-hidden bg-[#f2f2f7] text-[#1c1c1e] shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <header className="border-b border-black/5 px-4 py-3 text-center">
        <p className="text-[11px] font-semibold tracking-wide text-black/45">
          {pass.description}
        </p>
      </header>
      <dl className="divide-y divide-black/10 bg-white">
        <Row label="Last message" value={pass.lastMessage} wide />
        <Row label="Username" value={`vexo.social/${pass.username}`} />
        <Row label="Status" value={pass.status} />
        <Row label="Automatic updates" value={pass.autoUpdate ? "On" : "Off"} />
        <Row label="Allow notifications" value={pass.notifications ? "On" : "Off"} />
        <Row label="Suggest on Lock Screen" value={pass.lockScreen ? "On" : "Off"} />
        <Row label="Noun seed" value={pass.nounSeed} />
        {Object.keys(pass.extra ?? {}).length > 0 ? (
          <Row label="Extra" value={JSON.stringify(pass.extra)} wide />
        ) : null}
        <Row label="How to use" value="Add this pass, then tap a site or a terminal." />
        <div className="px-4 py-3">
          <dt className="text-[13px] font-semibold">Terms of Use</dt>
          <dd className="mt-2 space-y-1 text-[12px] leading-5 text-black/55">
            {pass.terms.map((line, i) => (
              <p key={line}>
                {i + 1}. {line}
              </p>
            ))}
          </dd>
        </div>
        <Row label="Issuer" value={pass.issuerName} link={pass.issuerEmail} />
        <Row label="Card serial number" value={pass.serial} />
        <Row
          label="Updated"
          value={new Date(pass.updatedAt).toLocaleString()}
        />
      </dl>
    </article>
  );
}

function Row({
  label,
  value,
  wide,
  link,
}: {
  label: string;
  value: string;
  wide?: boolean;
  link?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-[13px] font-medium">{label}</dt>
      <dd
        className={`text-right text-[13px] text-black/55 ${wide ? "max-w-[62%] text-left" : ""}`}
      >
        {link ? (
          <a className="text-[#007aff]" href={`mailto:${link}`}>
            {value}
            <span className="mt-1 block">{link}</span>
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
