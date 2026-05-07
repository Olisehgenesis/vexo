"use client";

import { useRef, useEffect } from "react";
import { Paperclip, ArrowUpRight, ArrowDownLeft, FileText, X, Plus } from "lucide-react";

interface ActionPickerProps {
  open: boolean;
  onToggle: () => void;
  onAttach: (file: File) => void;
  onSendMoney: () => void;
  onRequestMoney: () => void;
  onInvoice: () => void;
}

export function ActionPicker({
  open,
  onToggle,
  onAttach,
  onSendMoney,
  onRequestMoney,
  onInvoice,
}: ActionPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  const actions = [
    {
      icon: Paperclip,
      label: "Attach",
      color: "text-[#0369A1]",
      bg: "bg-[#E0F2FE] hover:bg-[#BAE6FD] border-[#BAE6FD]",
      onClick: () => fileRef.current?.click(),
    },
    {
      icon: ArrowUpRight,
      label: "Send",
      color: "text-[#16A34A]",
      bg: "bg-[#DCFCE7] hover:bg-[#BBF7D0] border-[#BBF7D0]",
      onClick: () => { onToggle(); onSendMoney(); },
    },
    {
      icon: ArrowDownLeft,
      label: "Request",
      color: "text-[#854D0E]",
      bg: "bg-[#FEF9C3] hover:bg-[#FEF08A] border-[#FEF08A]",
      onClick: () => { onToggle(); onRequestMoney(); },
    },
    {
      icon: FileText,
      label: "Invoice",
      color: "text-[#92400E]",
      bg: "bg-[#F5E6C8] hover:bg-[#FDE68A] border-[#FDE68A]",
      onClick: () => { onToggle(); onInvoice(); },
    },
  ];

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-[#16A34A] text-white rotate-45 shadow-md"
            : "bg-[#F5EFE4] hover:bg-[#EDE9E0] text-[#6B7280] hover:text-[#1F2937] border border-[#E7E2D8]"
        }`}
        aria-label="More actions"
      >
        {open ? <X size={18} /> : <Plus size={18} />}
      </button>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onAttach(file); onToggle(); }
          e.target.value = "";
        }}
      />

      {open && (
        <div
          className="absolute bottom-12 left-0 z-50 flex flex-col gap-1.5 p-2 rounded-2xl bg-[#FFFDF8] border border-[#E7E2D8] w-36"
          style={{ boxShadow: "0 8px 24px rgba(120,80,20,0.12), 0 2px 8px rgba(120,80,20,0.06)" }}
        >
          {actions.map(({ icon: Icon, label, color, bg, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${bg} ${color}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
