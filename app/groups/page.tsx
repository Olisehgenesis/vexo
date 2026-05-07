"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useReadContracts } from "wagmi";
import { Navigation } from "@/components/Navigation";
import { useMyProfile, useUsernameOf, useResolveUsername } from "@/hooks/useProfile";
import { useGroups, useGroupDetail } from "@/hooks/useGroups";
import { useXmtp } from "@/hooks/useXmtp";
import { VEXO_ABI, VEXO_CONTRACT_ADDRESS } from "@/lib/contracts";

function GroupCard({
  groupId,
  inviteMember,
  isPending,
  onRefetch,
}: {
  groupId: bigint;
  inviteMember: (g: bigint, p: bigint) => Promise<unknown>;
  isPending: boolean;
  onRefetch: () => void;
}) {
  const { name, ownerProfileId, members } = useGroupDetail(groupId);
  const ownerUsername = useUsernameOf(ownerProfileId);
  const [expanded, setExpanded] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState("");
  const { client, connect, isConnecting } = useXmtp();
  const router = useRouter();

  // Batch-resolve member profile IDs → wallet addresses
  const { data: memberAddressData } = useReadContracts({
    contracts: members.map((id) => ({
      address: VEXO_CONTRACT_ADDRESS as `0x${string}`,
      abi: VEXO_ABI,
      functionName: "ownerOf" as const,
      args: [id] as [bigint],
    })),
  });
  const memberAddresses = (memberAddressData ?? [])
    .map((r) => r.result as `0x${string}`)
    .filter(Boolean);

  const openGroupChat = async () => {
    setChatError("");
    if (!client) {
      await connect();
      return;
    }
    setOpeningChat(true);
    try {
      const { IdentifierKind, ConsentState } = await import("@xmtp/browser-sdk");
      // Sync all conversations from the network (works across devices)
      await client.conversations.syncAll([ConsentState.Allowed, ConsentState.Unknown]);

      // Look for an existing XMTP group whose description encodes this on-chain groupId
      const tag = `vexo-group:${groupId}`;
      const allGroups = await client.conversations.listGroups({
        consentStates: [ConsentState.Allowed, ConsentState.Unknown],
      });
      const existing = allGroups.find((g) => (g as { description?: string }).description === tag);

      if (existing) {
        router.push(`/chat/${existing.id}`);
        return;
      }

      // Not found — create it, embedding the on-chain groupId in the description
      const identifiers = memberAddresses
        .filter((a): a is `0x${string}` => !!a)
        .map((addr) => ({
          identifier: addr,
          identifierKind: IdentifierKind.Ethereum,
        }));
      const group = await client.conversations.createGroupWithIdentifiers(
        identifiers,
        { groupDescription: tag, groupName: name || `Group #${groupId}` }
      );

      router.push(`/chat/${group.id}`);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to open chat");
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#F9F5EF] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] flex items-center justify-center text-[#16A34A] font-bold text-sm">
            {name ? name[0].toUpperCase() : "G"}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#1F2937]">{name || `Group #${groupId}`}</p>
            <p className="text-xs text-[#9CA3AF]">
              {members.length} member{members.length !== 1 ? "s" : ""} ·{" "}
              {ownerUsername ? `@${ownerUsername}` : `#${ownerProfileId}`}
            </p>
          </div>
        </div>
        <span className="text-[#9CA3AF] text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E7E2D8]">
          <p className="text-xs text-[#9CA3AF] mt-3 mb-2 font-semibold uppercase tracking-wide">Members</p>
          <div className="flex flex-wrap gap-2">
            {members.map((mId) => (
              <MemberChip key={mId.toString()} profileId={mId} />
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">Group #{groupId.toString()}</span>
              <button
                onClick={openGroupChat}
                disabled={openingChat || isConnecting}
                className="text-xs bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-semibold transition-colors"
              >
                {openingChat
                  ? "Opening…"
                  : isConnecting
                  ? "Connecting…"
                  : !client
                  ? "🔌 Connect & Chat"
                  : "💬 Open Chat"}
              </button>
            </div>
            {chatError && (
              <p className="text-red-500 text-xs">{chatError}</p>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#9CA3AF]">Invite link</span>
              <CopyInviteLink groupId={groupId} />
            </div>
            <InvitePanel
              groupId={groupId}
              inviteMember={inviteMember}
              isPending={isPending}
              onSuccess={onRefetch}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline invite panel — accepts @username or 0x address */
function InvitePanel({
  groupId,
  inviteMember,
  isPending,
  onSuccess,
}: {
  groupId: bigint;
  inviteMember: (g: bigint, p: bigint) => Promise<unknown>;
  isPending: boolean;
  onSuccess: () => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const isUsername = input.trim().startsWith("@") || (!input.trim().startsWith("0x") && input.trim().length > 0);
  const isAddress = input.trim().startsWith("0x");

  // Resolve @username → profileId
  const { profileId: resolvedProfileId, loading: resolving, notFound } = useResolveUsername(
    isUsername ? input.trim() : ""
  );

  // Resolve 0x address → profileId (via profileOf)
  const { data: profileIdFromAddr } = useReadContracts({
    contracts: isAddress ? [{
      address: VEXO_CONTRACT_ADDRESS as `0x${string}`,
      abi: VEXO_ABI,
      functionName: "profileOf" as const,
      args: [input.trim() as `0x${string}`],
    }] : [],
  });
  const addrProfileId = isAddress
    ? (profileIdFromAddr?.[0]?.result as bigint | undefined)
    : undefined;

  const targetProfileId = isUsername ? resolvedProfileId : addrProfileId;
  const canInvite = !!targetProfileId && targetProfileId > 0n && !resolving;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfileId) return;
    setError(""); setOk("");
    try {
      await inviteMember(groupId, targetProfileId);
      setInput("");
      setOk(`Invited!`);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite");
    }
  };

  return (
    <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-2">
      <p className="text-xs text-[#6B7280] font-semibold">Invite member</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); setOk(""); }}
            placeholder="@username or 0x…"
            className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
          />
          {isUsername && input.trim().length >= 3 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
              {resolving ? (
                <span className="text-[#9CA3AF]">…</span>
              ) : canInvite ? (
                <span className="text-[#16A34A] font-bold">✓</span>
              ) : notFound ? (
                <span className="text-red-500">✗</span>
              ) : null}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending || !canInvite}
          className="text-xs bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white px-3 py-2 rounded-xl font-semibold transition-colors"
        >
          {isPending ? "…" : "Invite"}
        </button>
      </div>
      {ok && <p className="text-[#16A34A] text-[10px] font-medium">{ok}</p>}
      {error && <p className="text-red-500 text-[10px]">{error}</p>}
    </form>
  );
}

function CopyInviteLink({ groupId }: { groupId: bigint }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const url = `${window.location.origin}/groups?join=${groupId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="text-xs text-[#16A34A] hover:text-[#15803D] underline underline-offset-2 transition-colors font-medium"
    >
      {copied ? "✅ Copied!" : "🔗 Copy link"}
    </button>
  );
}

function MemberChip({ profileId }: { profileId: bigint }) {
  const username = useUsernameOf(profileId);
  return (
    <span className="bg-[#F5EFE4] border border-[#E7E2D8] text-xs text-[#6B7280] px-2.5 py-1 rounded-full font-medium">
      {username ? `@${username}` : `#${profileId}`}
    </span>
  );
}

function GroupsPageInner() {
  const { profileId, hasProfile } = useMyProfile();
  const { groupIds, isPending, createGroup, inviteMember, joinGroup, refetch } = useGroups(profileId);
  const searchParams = useSearchParams();
  const router = useRouter();

  // ?join=<groupId> invite link handler
  const joinParam = searchParams.get("join");
  const joinGroupId = joinParam ? BigInt(joinParam) : undefined;
  const { name: joinGroupName } = useGroupDetail(joinGroupId);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  const handleJoinFromLink = async () => {
    if (!joinGroupId) return;
    setJoining(true); setJoinError("");
    try {
      await joinGroup(joinGroupId);
      setJoinSuccess(`Joined ${joinGroupName || `Group #${joinGroupId}`}!`);
      refetch();
      router.replace("/groups");
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  const [groupName, setGroupName] = useState("");
  const [accessType, setAccessType] = useState<0|1|2>(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!groupName.trim()) return;
    try {
      await createGroup(groupName.trim(), accessType);
      setGroupName("");
      setAccessType(0);
      setShowCreate(false);
      setSuccess("Group created!");
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  if (!hasProfile) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen pt-14 pb-20 md:pl-56 md:pb-0 flex items-center justify-center bg-[#FAF7F2]">
          <p className="text-[#9CA3AF]">Create a profile first.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-14 pb-20 md:pl-56 md:pb-0 px-4 bg-[#FAF7F2]">
        <div className="max-w-xl mx-auto py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#1F2937]">Groups</h1>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="text-sm bg-[#16A34A] hover:bg-[#15803D] text-white font-bold px-4 py-2 rounded-xl transition-colors"
            >
              {showCreate ? "Cancel" : "+ New Group"}
            </button>
          </div>

          {/* Join-via-link banner */}
          {joinGroupId && !joinSuccess && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 mb-5">
              <p className="text-sm font-semibold text-[#1F2937] mb-1">
                You&apos;ve been invited to join
              </p>
              <p className="text-base font-bold text-[#1F2937] mb-3">
                {joinGroupName || `Group #${joinGroupId}`}
              </p>
              {joinError && <p className="text-red-500 text-xs mb-2">{joinError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleJoinFromLink}
                  disabled={joining || !hasProfile}
                  className="text-sm bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  {joining ? "Joining…" : "Join Group"}
                </button>
                <button
                  onClick={() => router.replace("/groups")}
                  className="text-sm text-[#6B7280] hover:text-[#1F2937] px-3 py-2 transition-colors"
                >
                  Dismiss
                </button>
              </div>
              {!hasProfile && (
                <p className="text-xs text-[#9CA3AF] mt-2">Create a profile first to join.</p>
              )}
            </div>
          )}
          {joinSuccess && (
            <p className="text-[#16A34A] text-sm mb-4 font-semibold">✅ {joinSuccess}</p>
          )}

          {/* Create group form */}
          {showCreate && (
            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 mb-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
              <h2 className="font-bold text-[#1F2937] text-sm mb-3">Create Group</h2>
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  maxLength={64}
                  className="bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
                />
                <div className="flex gap-2">
                  {([0, 1, 2] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAccessType(t)}
                      title={t === 0 ? "Anyone can join instantly" : t === 1 ? "Members must be approved by owner" : "Invite-only"}
                      className={`flex-1 text-xs py-2 rounded-xl border font-semibold transition-colors ${
                        accessType === t
                          ? "bg-[#16A34A] border-[#16A34A] text-white"
                          : "bg-[#F5EFE4] border-[#E7E2D8] text-[#6B7280] hover:border-[#16A34A]"
                      }`}
                    >
                      {t === 0 ? "Open" : t === 1 ? "Request" : "Invite-only"}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#9CA3AF]">
                  {accessType === 0 ? "Anyone can join instantly" : accessType === 1 ? "Members must request — you approve" : "Only invited members can join"}
                </p>
                <button
                  type="submit"
                  disabled={isPending || !groupName.trim()}
                  className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  {isPending ? "Creating…" : "Create"}
                </button>
              </form>
            </div>
          )}

          {success && <p className="text-[#16A34A] text-xs mb-3 font-medium">{success}</p>}
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

          {/* Groups list */}
          {groupIds.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <p className="text-2xl mb-2">🏛</p>
              <p className="text-sm">No groups yet.</p>
              <p className="text-xs mt-1">Create one to coordinate with others.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupIds.map((gId) => (
                <GroupCard
                  key={gId.toString()}
                  groupId={gId}
                  inviteMember={inviteMember as (g: bigint, p: bigint) => Promise<unknown>}
                  isPending={isPending}
                  onRefetch={refetch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function GroupsPage() {
  return (
    <Suspense>
      <GroupsPageInner />
    </Suspense>
  );
}
