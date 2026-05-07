"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useMyProfile } from "@/hooks/useProfile";
import { MessageSquare, Users, Globe, User, Shield } from "lucide-react";

const NAV = [
  { href: "/chat",     label: "Chats",    Icon: MessageSquare },
  { href: "/friends",  label: "Friends",  Icon: Users },
  { href: "/groups",   label: "Groups",   Icon: Globe },
  { href: "/profile",  label: "Profile",  Icon: User },
  { href: "/recovery", label: "Recovery", Icon: Shield },
];

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { username, profileId } = useMyProfile();

  return (
    <>
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-14
        bg-[#FFFDF8]/95 backdrop-blur-md border-b border-[#E7E2D8]"
        style={{ boxShadow: "0 1px 3px rgba(120,80,20,0.06)" }}
      >
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="vexoSocial" width={80} height={80} className="rounded-2xl" />
        </Link>

        <div className="flex items-center gap-3">
          {isConnected && profileId > 0n && (
            <span className="hidden sm:block text-xs text-[#9CA3AF] bg-[#F5EFE4] px-2.5 py-1 rounded-full border border-[#E7E2D8]">
              {username ? `@${username}` : `#${profileId.toString()}`}
            </span>
          )}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </header>

      {/* Desktop side nav */}
      {isConnected && (
        <nav className="hidden md:flex fixed top-14 left-0 bottom-0 w-56 flex-col gap-0.5 p-3
          bg-[#FFFDF8] border-r border-[#E7E2D8] z-40"
          style={{ boxShadow: "1px 0 4px rgba(120,80,20,0.04)" }}
        >
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest px-3 pt-1 pb-2">
            Navigation
          </p>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/chat" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${active
                    ? "bg-[#DCFCE7] text-[#16A34A] shadow-sm"
                    : "text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F5EFE4]"
                  }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                {label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Mobile floating bottom nav */}
      {isConnected && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
          <nav
            className="flex items-center justify-around px-2 py-2 rounded-2xl bg-[#FFFDF8] border border-[#E7E2D8]"
            style={{ boxShadow: "0 4px 20px rgba(120,80,20,0.12), 0 1px 4px rgba(120,80,20,0.06)" }}
          >
            {NAV.map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== "/chat" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-150 min-w-[44px]
                    ${active
                      ? "text-[#16A34A]"
                      : "text-[#9CA3AF] hover:text-[#6B7280]"
                    }`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150
                    ${active ? "bg-[#DCFCE7]" : ""}`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                  <span className="text-[9px] font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
