"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useXmtp } from "@/hooks/useXmtp";
import { useMyProfile, useOwnerOf, useResolveUsername, useUsernameOf, useProfileByAddress } from "@/hooks/useProfile";
import { useFriends } from "@/hooks/useFriends";
import { type Dm, ConsentState } from "@xmtp/browser-sdk";
import { formatDate } from "@/lib/xmtp";
import { MessageSquare, PenLine, Search, RefreshCw, X, AtSign, Wallet, Globe } from "lucide-react";

// ─── Conversation row ────────────────────────────────────────────────────────

function ConversationItem({
  convo,
  active,
  onClick,
  client,
}: {
  convo: Dm;
  active: boolean;
  onClick: () => void;
  client: import("@xmtp/browser-sdk").Client;
}) {
  const [lastMsg, setLastMsg] = useState("");
  const [time, setTime] = useState("");
  const [peerAddress, setPeerAddress] = useState<`0x${string}` | undefined>();
  const [peerId, setPeerId] = useState("");

  useEffect(() => {
    (async () => {
      const [inboxId, msgs] = await Promise.all([
        convo.peerInboxId(),
        convo.messages({ limit: 10n }),
      ]);
      setPeerId(inboxId);
      try {
        const states = await client.preferences.getInboxStates([inboxId]);
        const addr = states?.[0]?.accountIdentifiers?.[0]?.identifier;
        if (addr) setPeerAddress(addr as `0x${string}`);
      } catch {}
      // Find the last actual text message (skip system/group-update events)
      const textMsg = [...msgs].reverse().find((m) => typeof m.content === "string");
      if (textMsg) {
        const raw = textMsg.content as string;
        setLastMsg(raw.startsWith("__VEXO:") ? "💳 Payment" : raw.startsWith("__REPLY:") ? raw.split("\n")[1] ?? raw : raw);
        setTime(formatDate(textMsg.sentAt));
      }
    })();
  }, [convo, client]);

  const { username } = useProfileByAddress(peerAddress);
  const displayName = username
    ? `@${username}`
    : peerAddress
    ? `${peerAddress.slice(0, 6)}…${peerAddress.slice(-4)}`
    : peerId
    ? "Unnamed User"
    : "…";

  const avatarLetter = username
    ? username[0].toUpperCase()
    : peerAddress
    ? peerAddress.slice(2, 4).toUpperCase()
    : "?";

  // Generate a stable warm color for the avatar from the address
  const avatarColors = [
    "bg-[#DCFCE7] text-[#16A34A]",
    "bg-[#FEF9C3] text-[#854D0E]",
    "bg-[#F5E6C8] text-[#92400E]",
    "bg-[#E0F2FE] text-[#0369A1]",
    "bg-[#FCE7F3] text-[#9D174D]",
  ];
  const colorIdx = (peerAddress?.charCodeAt(2) ?? 0) % avatarColors.length;
  const avatarColor = avatarColors[colorIdx];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-150 text-left relative
        ${active
          ? "bg-[#F0FDF4] border-l-[3px] border-l-[#16A34A]"
          : "hover:bg-[#F9F5EF] border-l-[3px] border-l-transparent"
        }`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 text-sm ${avatarColor}`}>
        {avatarLetter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <p className={`text-sm font-semibold truncate ${active ? "text-[#16A34A]" : "text-[#1F2937]"}`}>
            {displayName}
          </p>
          {time && <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">{time}</span>}
        </div>
        <p className="text-xs text-[#9CA3AF] truncate mt-0.5 font-normal">{lastMsg || "No messages yet"}</p>
      </div>
    </button>
  );
}

function ConversationSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 animate-pulse">
      <div className="w-10 h-10 rounded-2xl bg-[#F5EFE4] flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 bg-[#F5EFE4] rounded-full w-28" />
        <div className="h-2.5 bg-[#F5EFE4]/70 rounded-full w-40" />
      </div>
    </div>
  );
}

function FriendDmButton({
  profileId,
  onOpen,
}: {
  profileId: bigint;
  onOpen: (address: string) => void;
}) {
  const owner = useOwnerOf(profileId);
  const username = useUsernameOf(profileId);
  if (!owner) return null;
  return (
    <button
      onClick={() => onOpen(owner)}
      className="flex flex-col items-center gap-1 flex-shrink-0 group"
    >
      <div className="w-11 h-11 rounded-2xl bg-[#DCFCE7] flex items-center justify-center text-[#16A34A] text-sm font-bold
        group-hover:bg-[#16A34A] group-hover:text-white transition-all duration-150">
        {username ? username[0].toUpperCase() : profileId.toString().slice(-2)}
      </div>
      <span className="text-[9px] text-[#9CA3AF] max-w-[52px] truncate">
        {username ? `@${username}` : `#${profileId}`}
      </span>
    </button>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { client, isConnecting, connect, error } = useXmtp();
  const { profileId } = useMyProfile();
  const { friends } = useFriends(profileId);

  const [conversations, setConversations] = useState<Dm[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [newDmInput, setNewDmInput] = useState("");
  const [dmError, setDmError] = useState("");

  // Active conversation id from URL
  const activeId = pathname.startsWith("/chat/") ? pathname.split("/chat/")[1] : null;

  // ── New DM modal state ────────────────────────────────────────────────────
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect input type
  const trimmed = newDmInput.trim();
  const isCeloName = trimmed.endsWith(".celo") && trimmed.length > 5;
  const isAddressInput = trimmed.startsWith("0x") && trimmed.length >= 10;
  const isVexoUsername = !isCeloName && !isAddressInput && trimmed.length > 0;

  // Vexo @username resolution
  const { address: resolvedVexoAddress, loading: resolvingVexo, notFound: vexoNotFound } =
    useResolveUsername(isVexoUsername ? trimmed.replace(/^@/, "") : "");

  // .celo name resolution via Nomspace API
  const [celoNameAddress, setCeloNameAddress] = useState<string | null>(null);
  const [celoNameLoading, setCeloNameLoading] = useState(false);
  const [celoNameNotFound, setCeloNameNotFound] = useState(false);

  useEffect(() => {
    if (!isCeloName) {
      setCeloNameAddress(null);
      setCeloNameNotFound(false);
      return;
    }
    let cancelled = false;
    setCeloNameLoading(true);
    setCeloNameAddress(null);
    setCeloNameNotFound(false);
    fetch(`https://api.nom.space/v1/name/${encodeURIComponent(trimmed)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const addr = data?.address ?? data?.owner ?? null;
        if (addr && addr.startsWith("0x")) {
          setCeloNameAddress(addr);
        } else {
          setCeloNameNotFound(true);
        }
      })
      .catch(() => { if (!cancelled) setCeloNameNotFound(true); })
      .finally(() => { if (!cancelled) setCeloNameLoading(false); });
    return () => { cancelled = true; };
  }, [isCeloName, trimmed]);

  // Final resolved address
  const targetAddress: `0x${string}` | undefined = isAddressInput
    ? (trimmed as `0x${string}`)
    : isCeloName
    ? (celoNameAddress as `0x${string}` | null) ?? undefined
    : isVexoUsername
    ? resolvedVexoAddress
    : undefined;

  const resolving = resolvingVexo || celoNameLoading;
  const canDm = !!targetAddress && !resolving;

  // Resolution status indicator
  const resolutionStatus: "idle" | "loading" | "found" | "notfound" = resolving
    ? "loading"
    : isVexoUsername && trimmed.length >= 2
      ? resolvedVexoAddress ? "found" : vexoNotFound ? "notfound" : "idle"
    : isCeloName
      ? celoNameAddress ? "found" : celoNameNotFound ? "notfound" : "idle"
    : "idle";

  // Auto-focus when modal opens
  useEffect(() => {
    if (showNewDm) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showNewDm]);

  const loadConversations = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      await client.conversations.syncAll([
        ConsentState.Allowed,
        ConsentState.Unknown,
        ConsentState.Denied,
      ]);
      const dms = await client.conversations.listDms({
        consentStates: [ConsentState.Allowed, ConsentState.Unknown],
      });
      setConversations(dms);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openDm = async (address: string) => {
    if (!client || !address.startsWith("0x")) return;
    setDmError("");
    try {
      const { IdentifierKind } = await import("@xmtp/browser-sdk");
      const dm = await client.conversations.createDmWithIdentifier({
        identifier: address as `0x${string}`,
        identifierKind: IdentifierKind.Ethereum,
      });
      setShowNewDm(false);
      setNewDmInput("");
      router.push(`/chat/${dm.id}`);
    } catch (e) {
      setDmError(e instanceof Error ? e.message : "Could not start DM");
    }
  };

  // ── Not connected state ────────────────────────────────────────────────────
  if (!client) {
    return (
      <div className="flex flex-col h-full bg-[#FFFDF8]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E2D8]">
          <h1 className="text-base font-bold text-[#1F2937]">Messages</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#DCFCE7] flex items-center justify-center mb-4">
            <MessageSquare size={26} className="text-[#16A34A]" />
          </div>
          <p className="text-[#1F2937] font-semibold text-sm mb-1.5">Enable messaging</p>
          <p className="text-[#9CA3AF] text-xs mb-6 leading-relaxed max-w-[200px]">
            Sign once to create your end-to-end encrypted inbox
          </p>
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            onClick={connect}
            disabled={isConnecting}
            className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-semibold py-2.5 px-6 rounded-xl transition-colors"
          >
            {isConnecting ? "Connecting…" : "Connect Messaging"}
          </button>
        </div>
      </div>
    );
  }

  // ── New DM modal ───────────────────────────────────────────────────────────
  const NewDmModal = showNewDm ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) { setShowNewDm(false); setNewDmInput(""); setDmError(""); } }}
    >
      <div className="bg-white rounded-2xl border border-[#E7E2D8] w-full max-w-sm shadow-xl"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F5EFE4]">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">New Message</h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Start a direct conversation</p>
          </div>
          <button
            onClick={() => { setShowNewDm(false); setNewDmInput(""); setDmError(""); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F5EFE4] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            {/* Prefix icon based on detected type */}
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isCeloName
                ? <Globe size={14} className="text-[#0369A1]" />
                : isAddressInput
                ? <Wallet size={14} className="text-[#6B7280]" />
                : <AtSign size={14} className="text-[#9CA3AF]" />}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={newDmInput}
              onChange={(e) => { setNewDmInput(e.target.value); setDmError(""); }}
              onKeyDown={(e) => e.key === "Enter" && canDm && openDm(targetAddress!)}
              placeholder="username, 0x address, or name.celo"
              className="w-full bg-[#F9F5EF] border border-[#E7E2D8] text-[#1F2937] text-sm pl-9 pr-9 py-3 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
            />
            {/* Status indicator */}
            {trimmed.length >= 2 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none">
                {resolutionStatus === "loading" && <span className="text-[#9CA3AF]">…</span>}
                {resolutionStatus === "found" && <span className="text-[#16A34A] font-bold text-base">✓</span>}
                {resolutionStatus === "notfound" && <span className="text-red-500 font-bold text-base">✗</span>}
              </span>
            )}
          </div>

          {/* Type hints */}
          <div className="flex gap-2 mt-3">
            {[
              { icon: <AtSign size={10} />, label: "@vexo username", color: "bg-[#DCFCE7] text-[#16A34A]" },
              { icon: <Wallet size={10} />, label: "0x wallet", color: "bg-[#F5EFE4] text-[#6B7280]" },
              { icon: <Globe size={10} />, label: "name.celo", color: "bg-[#E0F2FE] text-[#0369A1]" },
            ].map(({ icon, label, color }) => (
              <span key={label} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${color}`}>
                {icon}{label}
              </span>
            ))}
          </div>

          {/* Resolved address preview */}
          {targetAddress && resolutionStatus === "found" && !isAddressInput && (
            <p className="text-[11px] text-[#9CA3AF] mt-2 font-mono truncate">
              → {targetAddress.slice(0, 10)}…{targetAddress.slice(-6)}
            </p>
          )}
        </div>

        {/* Error */}
        {dmError && (
          <p className="px-5 pb-2 text-red-500 text-xs">{dmError}</p>
        )}

        {/* Action */}
        <div className="px-5 pb-5 pt-1">
          <button
            onClick={() => targetAddress && openDm(targetAddress)}
            disabled={!canDm}
            className="w-full bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 text-white text-sm font-bold py-3 rounded-xl transition-colors"
          >
            {resolving ? "Resolving…" : "Start Chat"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Connected state ────────────────────────────────────────────────────────
  return (
    <>
      {NewDmModal}
    <div className="flex flex-col h-full bg-[#FFFDF8]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E2D8] flex-shrink-0">
        <h1 className="text-base font-bold text-[#1F2937]">Messages</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={loadConversations}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F5EFE4] transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => { setShowNewDm((v) => !v); setNewDmInput(""); setDmError(""); }}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors
              ${showNewDm ? "bg-[#16A34A] text-white" : "text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F5EFE4]"}`}
            aria-label="New message"
          >
            <PenLine size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 border-b border-[#E7E2D8] flex-shrink-0">
        <div className="flex items-center gap-2 bg-[#F5EFE4] rounded-xl px-3 py-2">
          <Search size={13} className="text-[#9CA3AF] flex-shrink-0" />
          <span className="text-sm text-[#9CA3AF]">Search conversations…</span>
        </div>
      </div>

      {/* Friends quick-start */}
      {friends.length > 0 && (
        <div className="px-4 py-3 border-b border-[#E7E2D8] flex-shrink-0">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2.5">Friends</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {friends.map((fId) => (
              <FriendDmButton key={fId.toString()} profileId={fId} onOpen={openDm} />
            ))}
          </div>
        </div>
      )}

      {/* Section label */}
      <div className="px-5 pt-3 pb-1 flex-shrink-0">
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Recent</p>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          [...Array(5)].map((_, i) => <ConversationSkeleton key={i} />)
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-3xl bg-[#F5EFE4] flex items-center justify-center mb-3">
              <MessageSquare size={22} className="text-[#9CA3AF]" />
            </div>
            <p className="text-sm font-medium text-[#6B7280]">No conversations yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Tap the pencil icon to start a new DM</p>
          </div>
        ) : (
          conversations.map((c) => (
            <ConversationItem
              key={c.id}
              convo={c}
              active={activeId === c.id}
              onClick={() => router.push(`/chat/${c.id}`)}
              client={client}
            />
          ))
        )}
      </div>
    </div>
    </>
  );
}
