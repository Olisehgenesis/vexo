"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, IdCard, Sparkles } from "lucide-react";
import { DoodleField } from "./doodle-field";

const tabs = [
  { href: "/app", label: "Card", icon: IdCard },
  { href: "/app/mint", label: "Pass", icon: Sparkles },
  { href: "/app/send", label: "Send", icon: ArrowUpRight },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="phone-shell">
      <DoodleField />
      <div className="relative flex min-h-dvh flex-col pb-24">{children}</div>
      <nav className="absolute inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-panel px-6 py-3">
        <ul className="flex items-center justify-between">
          {tabs.map((tab) => {
            const active =
              tab.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={`pressable flex flex-col items-center gap-1 text-[11px] uppercase tracking-wide ${
                    active ? "text-violet" : "text-ink/45"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
