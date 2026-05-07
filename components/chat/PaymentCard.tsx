"use client";

import { useState } from "react";
import { useSendTransaction, useWriteContract, useChainId } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2, Loader2, ExternalLink, Paperclip } from "lucide-react";

// ─── Token config per chain ────────────────────────────────────────────────
const TOKENS: Record<
  number,
  Array<{ symbol: string; address: `0x${string}` | null; decimals: number }>
> = {
  42220: [ // Celo Mainnet
    { symbol: "CELO", address: null, decimals: 18 },
    { symbol: "cUSD", address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", decimals: 18 },
    { symbol: "cEUR", address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73", decimals: 18 },
  ],
};

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type VexoMessageType = "payment_request" | "payment_sent" | "invoice" | "attachment";

export interface VexoMessage {
  __vexo: true;
  type: VexoMessageType;
  id: string;
  amount?: string;
  token?: string;
  tokenAddress?: string | null;
  note?: string;
  from?: string;
  to?: string;
  txHash?: string;
  // invoice fields
  items?: Array<{ desc: string; amount: string }>;
  invoiceNumber?: string;
  dueDate?: string;
  // attachment fields
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileData?: string; // base64 data URL
}

export function parseVexoMessage(text: string): VexoMessage | null {
  if (!text.startsWith("__VEXO:")) return null;
  try {
    return JSON.parse(text.slice(7)) as VexoMessage;
  } catch {
    return null;
  }
}

export function encodeVexoMessage(msg: Omit<VexoMessage, "__vexo">): string {
  return `__VEXO:${JSON.stringify({ __vexo: true, ...msg })}`;
}

// ─── Individual card components ────────────────────────────────────────────

function PaymentRequestCard({
  msg,
  isMe,
  peerAddress,
}: {
  msg: VexoMessage;
  isMe: boolean;
  peerAddress?: string;
}) {
  const chainId = useChainId();
  const tokens = TOKENS[chainId] ?? TOKENS[44787];
  const token = tokens.find((t) => t.symbol === msg.token) ?? tokens[0];
  const [paid, setPaid] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { sendTransactionAsync, isPending: sendPending } = useSendTransaction();
  const { writeContractAsync, isPending: writePending } = useWriteContract();
  const pending = sendPending || writePending;

  const pay = async () => {
    if (!msg.amount || !msg.from) return;
    const to = (msg.from ?? peerAddress) as `0x${string}`;
    try {
      let hash: `0x${string}`;
      if (!token.address) {
        hash = await sendTransactionAsync({ to, value: parseEther(msg.amount) });
      } else {
        hash = await writeContractAsync({
          address: token.address,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [to, parseUnits(msg.amount, token.decimals)],
        });
      }
      setTxHash(hash);
      setPaid(true);
    } catch {
      // user rejected or error — silently ignore
    }
  };

  return (
    <div className={`rounded-2xl border p-4 min-w-[220px] max-w-[300px] ${
      isMe ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#FEF08A] bg-[#FEFCE8]"
    }`}
      style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isMe ? "bg-[#DCFCE7]" : "bg-[#FEF9C3]"}`}>
          <ArrowDownLeft size={16} className={isMe ? "text-[#16A34A]" : "text-[#854D0E]"} />
        </div>
        <div>
          <p className="text-xs font-bold text-[#1F2937]">Payment Request</p>
          <p className="text-[10px] text-[#9CA3AF]">{isMe ? "You requested" : "Requested from you"}</p>
        </div>
      </div>
      <p className="text-2xl font-bold text-[#1F2937] mb-0.5">
        {msg.amount} <span className="text-base font-medium text-[#6B7280]">{msg.token}</span>
      </p>
      {msg.note && <p className="text-xs text-[#6B7280] mt-1 mb-3 italic">“{msg.note}”</p>}
      {!isMe && !paid && (
        <button
          onClick={pay}
          disabled={pending}
          className="w-full mt-3 py-2.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          style={{ boxShadow: "0 2px 6px rgba(250,204,21,0.25)" }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
          {pending ? "Confirming…" : `Pay ${msg.amount} ${msg.token}`}
        </button>
      )}
      {((!isMe && paid) || txHash) ? (
        <div className="flex items-center gap-1.5 mt-2 text-[#16A34A]">
          <CheckCircle2 size={14} />
          <span className="text-xs font-semibold">Paid!</span>
          {txHash && (
            <a href={`https://explorer.celo.org/alfajores/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="ml-auto">
              <ExternalLink size={12} className="text-[#9CA3AF] hover:text-[#6B7280]" />
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PaymentSentCard({ msg, isMe }: { msg: VexoMessage; isMe: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 min-w-[200px] max-w-[280px] ${
      isMe ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#E7E2D8] bg-[#FFFDF8]"
    }`}
      style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isMe ? "bg-[#DCFCE7]" : "bg-[#F5EFE4]"}`}>
          <ArrowUpRight size={16} className={isMe ? "text-[#16A34A]" : "text-[#6B7280]"} />
        </div>
        <div>
          <p className="text-xs font-bold text-[#1F2937]">{isMe ? "You sent" : "Received"}</p>
          <p className="text-[10px] text-[#9CA3AF]">{isMe ? "Payment sent" : "Payment received"}</p>
        </div>
      </div>
      <p className="text-2xl font-bold text-[#1F2937] mb-0.5">
        {msg.amount} <span className="text-base font-medium text-[#6B7280]">{msg.token}</span>
      </p>
      {msg.note && <p className="text-xs text-[#6B7280] mt-1 italic">“{msg.note}”</p>}
      {msg.txHash && (
        <a
          href={`https://explorer.celo.org/alfajores/tx/${msg.txHash}`}
          target="_blank" rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-[10px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
        >
          <ExternalLink size={10} /> View on explorer
        </a>
      )}
    </div>
  );
}

function InvoiceCard({ msg, isMe, peerAddress }: { msg: VexoMessage; isMe: boolean; peerAddress?: string }) {
  const chainId = useChainId();
  const tokens = TOKENS[chainId] ?? TOKENS[44787];
  const token = tokens.find((t) => t.symbol === msg.token) ?? tokens[0];
  const [paid, setPaid] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { sendTransactionAsync, isPending: sendPending } = useSendTransaction();
  const { writeContractAsync, isPending: writePending } = useWriteContract();
  const pending = sendPending || writePending;

  const totalAmount = msg.items
    ? msg.items.reduce((s, i) => s + parseFloat(i.amount || "0"), 0).toFixed(4).replace(/\.?0+$/, "")
    : msg.amount ?? "0";

  const pay = async () => {
    const to = (msg.from ?? peerAddress) as `0x${string}`;
    try {
      let hash: `0x${string}`;
      if (!token.address) {
        hash = await sendTransactionAsync({ to, value: parseEther(totalAmount) });
      } else {
        hash = await writeContractAsync({
          address: token.address,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [to, parseUnits(totalAmount, token.decimals)],
        });
      }
      setTxHash(hash);
      setPaid(true);
    } catch {}
  };

  return (
    <div className={`rounded-2xl border p-4 min-w-[240px] max-w-[320px] ${
      isMe ? "border-[#E7E2D8] bg-[#FFFDF8]" : "border-[#E7E2D8] bg-white"
    }`}
      style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
            <FileText size={15} className="text-[#7C3AED]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1F2937]">Invoice</p>
            {msg.invoiceNumber && <p className="text-[10px] text-[#9CA3AF]">{msg.invoiceNumber}</p>}
          </div>
        </div>
        {msg.dueDate && <p className="text-[10px] text-[#9CA3AF]">Due {msg.dueDate}</p>}
      </div>
      {msg.items && msg.items.length > 0 && (
        <div className="space-y-1 mb-3 border-t border-[#E7E2D8] pt-2">
          {msg.items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-[#6B7280]">{item.desc}</span>
              <span className="text-[#1F2937] font-medium">{item.amount} {msg.token}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between items-baseline border-t border-[#E7E2D8] pt-2">
        <span className="text-xs text-[#9CA3AF]">Total</span>
        <p className="text-xl font-bold text-[#1F2937]">
          {totalAmount} <span className="text-sm font-medium text-[#6B7280]">{msg.token}</span>
        </p>
      </div>
      {msg.note && <p className="text-xs text-[#6B7280] mt-1 italic">“{msg.note}”</p>}
      {!isMe && !paid && (
        <button
          onClick={pay}
          disabled={pending}
          className="w-full mt-3 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          style={{ boxShadow: "0 2px 6px rgba(22,163,74,0.20)" }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
          {pending ? "Confirming…" : "Pay Invoice"}
        </button>
      )}
      {((!isMe && paid) || txHash) ? (
        <div className="flex items-center gap-1.5 mt-2 text-[#16A34A]">
          <CheckCircle2 size={14} />
          <span className="text-xs font-semibold">Paid!</span>
          {txHash && (
            <a href={`https://explorer.celo.org/alfajores/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="ml-auto">
              <ExternalLink size={12} className="text-[#9CA3AF] hover:text-[#6B7280]" />
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentCard({ msg, isMe }: { msg: VexoMessage; isMe: boolean }) {
  const isImage = msg.fileType?.startsWith("image/");
  const sizeLabel = msg.fileSize
    ? msg.fileSize > 1_000_000
      ? `${(msg.fileSize / 1_000_000).toFixed(1)} MB`
      : `${(msg.fileSize / 1_000).toFixed(0)} KB`
    : "";

  if (isImage && msg.fileData) {
    return (
      <div className="rounded-2xl overflow-hidden max-w-[260px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={msg.fileData} alt={msg.fileName ?? "image"} className="w-full rounded-2xl object-cover" />
        {msg.fileName && (
          <p className={`text-[10px] mt-1 ${isMe ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{msg.fileName}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 min-w-[180px] max-w-[260px] ${
      isMe ? "border-[#BAE6FD] bg-[#F0F9FF]" : "border-[#E7E2D8] bg-[#FFFDF8]"
    }`}
      style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}
    >
      <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
        <Paperclip size={16} className="text-[#0369A1]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#1F2937] truncate">{msg.fileName ?? "Attachment"}</p>
        {sizeLabel && <p className="text-[10px] text-[#9CA3AF]">{sizeLabel}</p>}
      </div>
    </div>
  );
}

// ─── Main exports ───────────────────────────────────────────────────────────

/** Render an already-parsed VexoMessage as a card */
export function VexoMessageCard({
  msg,
  isMe,
  peerAddress,
}: {
  msg: VexoMessage;
  isMe: boolean;
  peerAddress?: string;
}) {
  switch (msg.type) {
    case "payment_request":
      return <PaymentRequestCard msg={msg} isMe={isMe} peerAddress={peerAddress} />;
    case "payment_sent":
      return <PaymentSentCard msg={msg} isMe={isMe} />;
    case "invoice":
      return <InvoiceCard msg={msg} isMe={isMe} peerAddress={peerAddress} />;
    case "attachment":
      return <AttachmentCard msg={msg} isMe={isMe} />;
    default:
      return null;
  }
}

export function PaymentCard({
  text,
  isMe,
  peerAddress,
}: {
  text: string;
  isMe: boolean;
  peerAddress?: string;
}) {
  const msg = parseVexoMessage(text);
  if (!msg) return null;
  return <VexoMessageCard msg={msg} isMe={isMe} peerAddress={peerAddress} />;
}
