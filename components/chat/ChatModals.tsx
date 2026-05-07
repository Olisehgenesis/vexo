"use client";

import { useState } from "react";
import { useSendTransaction, useWriteContract, useChainId } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { X, ArrowUpRight, ArrowDownLeft, FileText, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { encodeVexoMessage } from "./PaymentCard";
import { nanoid } from "nanoid";

// ─── Token config ──────────────────────────────────────────────────────────
const CHAIN_TOKENS: Record<
  number,
  Array<{ symbol: string; address: `0x${string}` | null; decimals: number }>
> = {
  44787: [
    { symbol: "CELO", address: null, decimals: 18 },
    { symbol: "cUSD", address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", decimals: 18 },
    { symbol: "cEUR", address: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78470", decimals: 18 },
  ],
  42220: [
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

// ─── Shared components ─────────────────────────────────────────────────────

function ModalShell({
  title,
  icon: Icon,
  iconClass,
  onClose,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconClass: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-[#E7E2D8] rounded-2xl w-full max-w-sm" style={{ boxShadow: "0 16px 48px rgba(120,80,20,0.14), 0 4px 16px rgba(120,80,20,0.08)" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E7E2D8]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${iconClass}`}>
              <Icon size={16} />
            </div>
            <h2 className="text-sm font-bold text-[#1F2937]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-[#F5EFE4] hover:bg-[#EDE9E0] flex items-center justify-center text-[#6B7280] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function TokenAmountRow({
  tokens,
  token,
  amount,
  onToken,
  onAmount,
}: {
  tokens: Array<{ symbol: string }>;
  token: string;
  amount: string;
  onToken: (t: string) => void;
  onAmount: (a: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Amount</label>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
        />
      </div>
      <div className="w-28">
        <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Token</label>
        <select
          value={token}
          onChange={(e) => onToken(e.target.value)}
          className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] cursor-pointer transition-colors"
        >
          {tokens.map((t) => (
            <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Send Money Modal ──────────────────────────────────────────────────────

export function SendMoneyModal({
  onClose,
  onSend,
  peerAddress,
  myAddress,
}: {
  onClose: () => void;
  onSend: (encodedMsg: string) => Promise<void>;
  peerAddress?: string;
  myAddress?: string;
}) {
  const chainId = useChainId();
  const tokens = CHAIN_TOKENS[chainId] ?? CHAIN_TOKENS[44787];
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState(tokens[0].symbol);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { sendTransactionAsync, isPending: sendPending } = useSendTransaction();
  const { writeContractAsync, isPending: writePending } = useWriteContract();
  const pending = sendPending || writePending;

  const handleSend = async () => {
    if (!amount || !peerAddress) return;
    setErr(null);
    const tokenMeta = tokens.find((t) => t.symbol === token)!;
    const to = peerAddress as `0x${string}`;
    try {
      let hash: `0x${string}`;
      if (!tokenMeta.address) {
        hash = await sendTransactionAsync({ to, value: parseEther(amount) });
      } else {
        hash = await writeContractAsync({
          address: tokenMeta.address,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [to, parseUnits(amount, tokenMeta.decimals)],
        });
      }
      setTxHash(hash);
      setDone(true);
      // send XMTP message notifying the payment
      await onSend(
        encodeVexoMessage({
          type: "payment_sent",
          id: nanoid(),
          amount,
          token,
          tokenAddress: tokenMeta.address,
          note: note.trim() || undefined,
          from: myAddress,
          to: peerAddress,
          txHash: hash,
        })
      );
    } catch (e: unknown) {
      if (e instanceof Error && !e.message.includes("rejected")) {
        setErr("Transaction failed. Please try again.");
      }
    }
  };

  if (done) {
    return (
      <ModalShell title="Payment Sent" icon={CheckCircle2} iconClass="bg-[#DCFCE7] text-[#16A34A]" onClose={onClose}>
        <div className="flex flex-col items-center py-4 gap-3">
          <div className="w-16 h-16 rounded-3xl bg-[#DCFCE7] flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[#16A34A]" />
          </div>
          <p className="text-[#1F2937] font-bold">{amount} {token} sent!</p>
          {txHash && (
            <a
              href={`https://explorer.celo.org/alfajores/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#16A34A] hover:text-[#15803D]"
            >
              View on explorer →
            </a>
          )}
          <button onClick={onClose} className="mt-2 w-full py-2.5 rounded-xl bg-[#F5EFE4] hover:bg-[#EDE9E0] text-[#1F2937] text-sm font-medium transition-colors">
            Done
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Send Money" icon={ArrowUpRight} iconClass="bg-[#DCFCE7] text-[#16A34A]" onClose={onClose}>
      <div className="space-y-4">
        <TokenAmountRow tokens={tokens} token={token} amount={amount} onToken={setToken} onAmount={setAmount} />
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Note (optional)</label>
          <input
            type="text"
            placeholder="What’s it for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
          />
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <button
          onClick={handleSend}
          disabled={pending || !amount || parseFloat(amount) <= 0}
          className="w-full py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          style={{ boxShadow: "0 2px 8px rgba(22,163,74,0.25)" }}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
          {pending ? "Confirming on-chain…" : `Send ${amount || "0"} ${token}`}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Request Money Modal ───────────────────────────────────────────────────

export function RequestMoneyModal({
  onClose,
  onSend,
  myAddress,
  peerAddress,
}: {
  onClose: () => void;
  onSend: (encodedMsg: string) => Promise<void>;
  myAddress?: string;
  peerAddress?: string;
}) {
  const chainId = useChainId();
  const tokens = CHAIN_TOKENS[chainId] ?? CHAIN_TOKENS[44787];
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState(tokens[0].symbol);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const handleRequest = async () => {
    if (!amount) return;
    setSending(true);
    const tokenMeta = tokens.find((t) => t.symbol === token)!;
    try {
      await onSend(
        encodeVexoMessage({
          type: "payment_request",
          id: nanoid(),
          amount,
          token,
          tokenAddress: tokenMeta.address,
          note: note.trim() || undefined,
          from: myAddress,
          to: peerAddress,
        })
      );
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalShell title="Request Money" icon={ArrowDownLeft} iconClass="bg-[#FEF9C3] text-[#854D0E]" onClose={onClose}>
      <div className="space-y-4">
        <TokenAmountRow tokens={tokens} token={token} amount={amount} onToken={setToken} onAmount={setAmount} />
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Note (optional)</label>
          <input
            type="text"
            placeholder="What’s it for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
          />
        </div>
        <button
          onClick={handleRequest}
          disabled={sending || !amount || parseFloat(amount) <= 0}
          className="w-full py-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-sm font-bold transition-colors flex items-center justify-center gap-2"
          style={{ boxShadow: "0 2px 6px rgba(250,204,21,0.25)" }}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownLeft size={16} />}
          {sending ? "Sending request…" : `Request ${amount || "0"} ${token}`}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Invoice Modal ─────────────────────────────────────────────────────────

interface InvoiceItem {
  id: string;
  desc: string;
  amount: string;
}

export function InvoiceModal({
  onClose,
  onSend,
  myAddress,
  peerAddress,
}: {
  onClose: () => void;
  onSend: (encodedMsg: string) => Promise<void>;
  myAddress?: string;
  peerAddress?: string;
}) {
  const chainId = useChainId();
  const tokens = CHAIN_TOKENS[chainId] ?? CHAIN_TOKENS[44787];
  const [token, setToken] = useState(tokens[0].symbol);
  const [items, setItems] = useState<InvoiceItem[]>([{ id: nanoid(), desc: "", amount: "" }]);
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sending, setSending] = useState(false);

  const invNumber = `INV-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const addItem = () => setItems((prev) => [...prev, { id: nanoid(), desc: "", amount: "" }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id: string, field: "desc" | "amount", val: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)));

  const total = items.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
  const totalLabel = total.toFixed(4).replace(/\.?0+$/, "") || "0";

  const handleSend = async () => {
    const validItems = items.filter((i) => i.desc && i.amount);
    if (!validItems.length) return;
    setSending(true);
    try {
      await onSend(
        encodeVexoMessage({
          type: "invoice",
          id: nanoid(),
          invoiceNumber: invNumber,
          items: validItems.map(({ desc, amount }) => ({ desc, amount })),
          token,
          amount: totalLabel,
          note: note.trim() || undefined,
          dueDate: dueDate || undefined,
          from: myAddress,
          to: peerAddress,
        })
      );
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalShell title="Create Invoice" icon={FileText} iconClass="bg-[#F3E8FF] text-[#7C3AED]" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors"
            />
          </div>
          <div className="w-28">
            <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] cursor-pointer transition-colors"
            >
              {tokens.map((t) => (
                <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Line Items</label>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.desc}
                  onChange={(e) => updateItem(item.id, "desc", e.target.value)}
                  className="flex-1 bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={item.amount}
                  onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                  className="w-20 bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#16A34A] hover:text-[#15803D] transition-colors font-medium"
          >
            <Plus size={13} /> Add item
          </button>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] mb-1.5 block">Note (optional)</label>
          <input
            type="text"
            placeholder="Payment terms, thank you note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={150}
            className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
          />
        </div>

        <div className="flex justify-between items-center py-2 border-t border-[#E7E2D8]">
          <span className="text-xs text-[#9CA3AF]">Total</span>
          <span className="text-lg font-bold text-[#1F2937]">{totalLabel} {token}</span>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || total <= 0}
          className="w-full py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          style={{ boxShadow: "0 2px 8px rgba(22,163,74,0.25)" }}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          {sending ? "Sending invoice…" : `Send Invoice · ${totalLabel} ${token}`}
        </button>
      </div>
    </ModalShell>
  );
}
