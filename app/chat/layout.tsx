"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { ChatSidebar } from "./ChatSidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // On mobile: show sidebar XOR chat window based on whether we're in a convo
  const inConversation = pathname !== "/chat";

  return (
    <>
      <Navigation />
      <div className="flex h-screen pt-14 md:pl-56 overflow-hidden">
        {/* Left panel — conversation list */}
        <div
          className={`flex-shrink-0 border-r border-[#E7E2D8] bg-[#FFFDF8] flex flex-col w-full md:w-80 ${
            inConversation ? "hidden md:flex" : "flex"
          }`}
        >
          <ChatSidebar />
        </div>

        {/* Right panel — chat window or empty state */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-[#FAF7F2] ${
            inConversation ? "flex" : "hidden md:flex"
          }`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
