import { MessageSquare, ArrowRight } from "lucide-react";

export default function ChatIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center h-full text-center px-8">
      <div className="w-20 h-20 rounded-3xl bg-[#DCFCE7] flex items-center justify-center mb-5"
        style={{ boxShadow: "0 4px 16px rgba(22,163,74,0.12)" }}
      >
        <MessageSquare size={32} className="text-[#16A34A]" />
      </div>
      <h2 className="text-lg font-bold text-[#1F2937] mb-1.5">Your Messages</h2>
      <p className="text-sm text-[#9CA3AF] max-w-[240px] leading-relaxed">
        Select a conversation from the sidebar or start a new one
      </p>
      <div className="mt-6 flex items-center gap-1.5 text-[#16A34A] text-sm font-medium">
        <ArrowRight size={14} />
        <span>Pick a chat to get started</span>
      </div>
    </div>
  );
}
