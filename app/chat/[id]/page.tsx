"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useXmtp } from "@/hooks/useXmtp";
import { useProfileByAddress } from "@/hooks/useProfile";
import { type Conversation, type DecodedMessage, Group, isGroupUpdated, type GroupUpdated } from "@xmtp/browser-sdk";
import { formatDate } from "@/lib/xmtp";
import { useAccount } from "wagmi";
import { ActionPicker } from "@/components/chat/ActionPicker";
import { SendMoneyModal, RequestMoneyModal, InvoiceModal } from "@/components/chat/ChatModals";
import { parseVexoMessage, VexoMessageCard, encodeVexoMessage } from "@/components/chat/PaymentCard";
import { Reply, X } from "lucide-react";
import { nanoid } from "nanoid";

/** Resolves a wallet address → @username (or shortened address as fallback) */
function SenderLabel({ address, className }: { address?: string; className?: string }) {
  const { username } = useProfileByAddress(address as `0x${string}` | undefined);
  if (username) return <span className={className}>@{username}</span>;
  if (address) return <span className={className}>{address.slice(0, 6)}…{address.slice(-4)}</span>;
  return <span className={className}>…</span>;
}

// ─── Reply helpers ─────────────────────────────────────────────────────────
const REPLY_PREFIX = "__REPLY:";

interface ReplyMeta { q: string; s: string }

function encodeReply(meta: ReplyMeta, body: string) {
  return `${REPLY_PREFIX}${JSON.stringify(meta)}\n${body}`;
}

function decodeReply(text: string): { meta: ReplyMeta; body: string } | null {
  if (!text.startsWith(REPLY_PREFIX)) return null;
  const nl = text.indexOf("\n");
  if (nl === -1) return null;
  try {
    const meta = JSON.parse(text.slice(REPLY_PREFIX.length, nl)) as ReplyMeta;
    return { meta, body: text.slice(nl + 1) };
  } catch { return null; }
}

// ─── Swipeable message wrapper ─────────────────────────────────────────────
function SwipeableMessage({
  isMe,
  onReply,
  children,
}: {
  isMe: boolean;
  onReply: () => void;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const triggered = useRef(false);
  const THRESHOLD = 64;

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    triggered.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    // right swipe for received (isMe=false), left swipe for sent (isMe=true)
    const dir = isMe ? -1 : 1;
    const clamped = Math.max(0, Math.min(dx * dir, THRESHOLD + 16)) * dir;
    setOffset(clamped);
    if (Math.abs(clamped) >= THRESHOLD && !triggered.current) {
      triggered.current = true;
      onReply();
    }
  };

  const onPointerUp = () => {
    startX.current = null;
    setOffset(0);
  };

  const iconOpacity = Math.min(Math.abs(offset) / THRESHOLD, 1);

  return (
    <div className="relative flex items-center" style={{ touchAction: "pan-y" }}>
      {/* Reply icon — left side for received, right side for sent */}
      {!isMe && (
        <div
          className="absolute left-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#DCFCE7] transition-opacity"
          style={{ opacity: iconOpacity, transform: `translateX(${offset * 0.4}px)` }}
        >
          <Reply size={14} className="text-[#16A34A]" />
        </div>
      )}
      <div
        className="flex-1 transition-transform duration-100 ease-out select-none"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
      {isMe && (
        <div
          className="absolute right-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#DCFCE7] transition-opacity"
          style={{ opacity: iconOpacity, transform: `translateX(${-offset * 0.4}px)` }}
        >
          <Reply size={14} className="text-[#16A34A] scale-x-[-1]" />
        </div>
      )}
    </div>
  );
}

export default function ChatWindowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address } = useAccount();
  const { client } = useXmtp();

  const [convo, setConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  // inboxId → wallet address (resolved lazily)
  const [senderAddresses, setSenderAddresses] = useState<Map<string, string>>(new Map());
  const [peer, setPeer] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Action picker + modals
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modal, setModal] = useState<"send" | "request" | "invoice" | null>(null);
  // Reply state
  const [replyTo, setReplyTo] = useState<{ text: string; sender: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // peer wallet address (resolved)
  const peerAddress = senderAddresses.get(peer);

  const loadMessages = useCallback(async (c: Conversation) => {
    const msgs = await c.messages();
    // Deduplicate by message ID (stream may replay messages already in the initial load)
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const deduped = [...prev];
      for (const m of msgs) {
        if (!seen.has(m.id)) { seen.add(m.id); deduped.push(m); }
      }
      // Full replace on initial load (prev is []), or merge on refresh
      return prev.length === 0 ? msgs : deduped;
    });
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const streamRef = useRef<AsyncIterable<DecodedMessage> | null>(null);

  useEffect(() => {
    if (!client || !id) return;
    let cancelled = false;

    (async () => {
      const found = await client.conversations.getConversationById(id);
      if (!found) {
        router.replace("/chat");
        return;
      }
      if (cancelled) return;
      setConvo(found);
      // Detect group vs DM and set header info
      if (found instanceof Group) {
        setIsGroup(true);
        setGroupName((found as Group).name ?? "Group Chat");
        try {
          const mems = await (found as Group).members();
          setMemberCount(mems.length);
        } catch {}
      }
      // Sync from network before rendering to ensure past messages load
      try { await found.sync(); } catch {}
      await loadMessages(found);

      // Stream new messages using AsyncStreamProxy (for await...of)
      const stream = await found.stream();
      streamRef.current = stream;
      for await (const msg of stream) {
        if (cancelled) break;
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    })();

    return () => {
      cancelled = true;
      // Signal stream to close if it supports it
      if (streamRef.current && typeof (streamRef.current as unknown as AsyncGenerator)[Symbol.asyncIterator] !== 'undefined') {
        (streamRef.current as AsyncGenerator).return?.(undefined);
      }
    };
  }, [client, id, router, loadMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convo || !input.trim()) return;
    setSending(true);
    try {
      let text = input.trim();
      if (replyTo) {
        text = encodeReply(
          { q: replyTo.text.slice(0, 120), s: replyTo.sender },
          text
        );
        setReplyTo(null);
      }
      await convo.sendText(text);
      setInput("");
    } finally {
      setSending(false);
    }
  };

  const sendVexo = useCallback(async (encoded: string) => {
    if (!convo) return;
    await convo.sendText(encoded);
  }, [convo]);

  // Resolve inbox IDs (senders + peer) → wallet addresses whenever messages or peer change
  useEffect(() => {
    if (!client) return;
    const ids = new Set<string>();
    messages.forEach((m) => { if (m.senderInboxId) ids.add(m.senderInboxId); });
    if (peer) ids.add(peer);
    const unresolved = [...ids].filter((id) => !senderAddresses.has(id));
    if (unresolved.length === 0) return;
    client.preferences
      .getInboxStates(unresolved)
      .then((states) => {
        setSenderAddresses((prev) => {
          const next = new Map(prev);
          for (const state of states) {
            const addr = state.accountIdentifiers[0]?.identifier;
            if (addr) next.set(state.inboxId, addr);
          }
          return next;
        });
      })
      .catch(() => {});
  // senderAddresses intentionally excluded to avoid loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, peer, client]);


  useEffect(() => {
    if (convo && !isGroup && "peerInboxId" in convo) {
      (convo as Conversation & { peerInboxId: () => Promise<string> })
        .peerInboxId()
        .then(setPeer)
        .catch(() => {});
    }
  }, [convo, isGroup]);

  return (
    <div className="flex flex-col h-full pb-20 md:pb-0 bg-[#FAF7F2]">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E7E2D8] bg-[#FFFDF8] flex-shrink-0"
        style={{ boxShadow: "0 1px 3px rgba(120,80,20,0.05)" }}
      >
          <button
            onClick={() => router.push("/chat")}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F5EFE4] md:hidden transition-colors flex-shrink-0"
            aria-label="Back to messages"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="w-9 h-9 rounded-2xl bg-[#DCFCE7] flex items-center justify-center text-[#16A34A] text-xs font-bold flex-shrink-0">
            {isGroup
              ? (groupName[0]?.toUpperCase() ?? "G")
              : (senderAddresses.get(peer)?.[0]?.toUpperCase() ?? peer.slice(0, 2).toUpperCase())}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1F2937] truncate">
              {isGroup ? groupName : (
                <SenderLabel address={senderAddresses.get(peer)} />
              )}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              {isGroup
                ? `${memberCount} member${memberCount !== 1 ? "s" : ""} · encrypted`
                : "End-to-end encrypted · XMTP v3"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          {loading && (
            <div className="flex justify-center py-10">
              <span className="text-[#9CA3AF] text-sm">Loading messages…</span>
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 rounded-3xl bg-[#DCFCE7] flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <p className="text-sm font-medium text-[#6B7280]">No messages yet</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Send the first message!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = !!client?.inboxId && msg.senderInboxId === client.inboxId;
            const msgSenderAddr = senderAddresses.get(msg.senderInboxId ?? "");

            // Group membership system messages — centered pill
            if (isGroupUpdated(msg)) {
              const upd = msg.content as GroupUpdated;
              let label = "Group updated";
              if (upd.addedInboxes?.length > 0) label = `${upd.addedInboxes.length} member${upd.addedInboxes.length !== 1 ? "s" : ""} joined`;
              else if (upd.removedInboxes?.length > 0) label = `${upd.removedInboxes.length} member${upd.removedInboxes.length !== 1 ? "s" : ""} removed`;
              else if (upd.leftInboxes?.length > 0) label = `${upd.leftInboxes.length} member${upd.leftInboxes.length !== 1 ? "s" : ""} left`;
              else if (upd.metadataFieldChanges?.length > 0) label = "Group info updated";
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-[10px] text-[#9CA3AF] bg-[#F5EFE4] border border-[#E7E2D8] px-3 py-1 rounded-full">{label}</span>
                </div>
              );
            }

            const text = typeof msg.content === "string" ? msg.content : "";
            if (!text) return null;

            // ── Vexo payment / attachment card ──────────────────────────────
            const vexo = parseVexoMessage(text);
            if (vexo) {
              return (
                <SwipeableMessage
                  key={msg.id}
                  isMe={isMe}
                  onReply={() => {
                    setReplyTo({ text: `[${vexo.type.replace("_", " ")}]`, sender: isMe ? "You" : (msgSenderAddr?.slice(0, 6) ?? "them") });
                    inputRef.current?.focus();
                  }}
                >
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <VexoMessageCard msg={vexo} isMe={isMe} peerAddress={peerAddress} />
                  </div>
                </SwipeableMessage>
              );
            }

            // ── Reply-encoded message ────────────────────────────────────────
            const decoded = decodeReply(text);
            const displayText = decoded ? decoded.body : text;
            const replyMeta = decoded ? decoded.meta : null;
            const senderLabel = isMe ? "You" : (msgSenderAddr?.slice(0, 6) ?? "them");

            return (
              <SwipeableMessage
                key={msg.id}
                isMe={isMe}
                onReply={() => {
                  setReplyTo({ text: displayText.slice(0, 120), sender: senderLabel });
                  inputRef.current?.focus();
                }}
              >
                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[76%] rounded-2xl px-4 py-2.5 text-sm
                      ${isMe
                        ? "bg-[#16A34A] text-white rounded-br-sm"
                        : "bg-white text-[#1F2937] rounded-bl-sm border border-[#E7E2D8]"
                      }`}
                    style={isMe ? { boxShadow: "0 1px 4px rgba(22,163,74,0.18)" } : { boxShadow: "0 1px 3px rgba(120,80,20,0.06)" }}
                  >
                    {isGroup && !isMe && (
                      <p className="text-[10px] font-semibold text-[#16A34A] mb-0.5">
                        <SenderLabel address={msgSenderAddr} />
                      </p>
                    )}
                    {replyMeta && (
                      <div className={`mb-2 px-2.5 py-1.5 rounded-xl border-l-2 text-[11px]
                        ${isMe ? "border-white/40 bg-white/10" : "border-[#16A34A]/40 bg-[#F0FDF4]"}`}>
                        <p className={`font-semibold mb-0.5 ${isMe ? "text-white/80" : "text-[#16A34A]"}`}>{replyMeta.s}</p>
                        <p className={`line-clamp-2 ${isMe ? "text-white/70" : "text-[#6B7280]"}`}>{replyMeta.q}</p>
                      </div>
                    )}
                    <p className="break-words whitespace-pre-wrap leading-relaxed">{displayText}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-[#9CA3AF]"} text-right`}>
                      {formatDate(msg.sentAt)}
                    </p>
                  </div>
                </div>
              </SwipeableMessage>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply preview banner */}
        {replyTo && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-t border-[#E7E2D8] bg-[#F9F5EF]">
            <div className="w-0.5 h-8 bg-[#16A34A] rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-[#16A34A]">Replying to {replyTo.sender}</p>
              <p className="text-[11px] text-[#6B7280] truncate">{replyTo.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="w-6 h-6 rounded-full bg-[#E7E2D8] hover:bg-[#D1C9BC] flex items-center justify-center text-[#6B7280] flex-shrink-0 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Floating composer */}
        <form
          onSubmit={sendMessage}
          className="flex items-end gap-2 px-3 py-3 border-t border-[#E7E2D8] bg-[#FFFDF8]"
        >
          <ActionPicker
            open={pickerOpen}
            onToggle={() => setPickerOpen((o) => !o)}
            onAttach={async (file) => {
              setPickerOpen(false);
              const reader = new FileReader();
              reader.onload = async () => {
                const encoded = encodeVexoMessage({
                  type: "attachment",
                  id: nanoid(),
                  fileName: file.name,
                  fileType: file.type,
                  fileSize: file.size,
                  fileData: reader.result as string,
                });
                await sendVexo(encoded);
              };
              reader.readAsDataURL(file);
            }}
            onSendMoney={() => { setPickerOpen(false); setModal("send"); }}
            onRequestMoney={() => { setPickerOpen(false); setModal("request"); }}
            onInvoice={() => { setPickerOpen(false); setModal("invoice"); }}
          />
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !sending) sendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Write a message…"
              rows={1}
              style={{ resize: "none" }}
              className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-[#16A34A] focus:bg-white max-h-32 overflow-y-auto placeholder:text-[#9CA3AF] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-10 h-10 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-150 mb-0.5"
            style={{ boxShadow: input.trim() ? "0 2px 8px rgba(22,163,74,0.30)" : "none" }}
            aria-label="Send message"
          >
            {sending
              ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            }
          </button>
        </form>

        {/* Payment modals */}
        {modal === "send" && (
          <SendMoneyModal
            onClose={() => setModal(null)}
            onSend={sendVexo}
            peerAddress={peerAddress}
            myAddress={address}
          />
        )}
        {modal === "request" && (
          <RequestMoneyModal
            onClose={() => setModal(null)}
            onSend={sendVexo}
            myAddress={address}
            peerAddress={peerAddress}
          />
        )}
        {modal === "invoice" && (
          <InvoiceModal
            onClose={() => setModal(null)}
            onSend={sendVexo}
            myAddress={address}
            peerAddress={peerAddress}
          />
        )}
    </div>
  );
}
