"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useMyProfile, useProfileByAddress, useUsernameOf, useOwnerOf, useResolveUsername } from "@/hooks/useProfile";
import { useFriends } from "@/hooks/useFriends";
import { useXmtp } from "@/hooks/useXmtp";
import { useRouter } from "next/navigation";
import { useReadContracts } from "wagmi";
import { VEXO_ABI, VEXO_CONTRACT_ADDRESS } from "@/lib/contracts";
import { IdentifierKind } from "@xmtp/browser-sdk";

function ProfileBadge({ profileId }: { profileId: bigint }) {
  const username = useUsernameOf(profileId);
  const owner = useOwnerOf(profileId);
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-2xl bg-[#DCFCE7] flex items-center justify-center text-sm font-bold text-[#16A34A]">
        {username ? username[0].toUpperCase() : "#"}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1F2937]">
          {username ? `@${username}` : `#${profileId}`}
        </p>
        {owner && (
          <p className="text-xs text-[#9CA3AF] font-mono">
            {owner.slice(0, 6)}…{owner.slice(-4)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const { profileId, hasProfile } = useMyProfile();
  const { friends, incoming, outgoing, isPending, sendRequest, acceptRequest, rejectRequest, removeFriend, refetch } =
    useFriends(profileId);
  const { client } = useXmtp();

  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<"friends" | "requests">("friends");

  // Resolve @username or 0x address → profileId
  const isUsername = searchInput.trim().startsWith("@") ||
    (!searchInput.trim().startsWith("0x") && searchInput.trim().length > 0);
  const isAddress = searchInput.trim().startsWith("0x");

  const { profileId: resolvedByUsername, loading: resolvingUsername, notFound: usernameNotFound } =
    useResolveUsername(isUsername ? searchInput.trim() : "");

  const { data: addrLookup } = useReadContracts({
    contracts: isAddress ? [{
      address: VEXO_CONTRACT_ADDRESS as `0x${string}`,
      abi: VEXO_ABI,
      functionName: "profileOf" as const,
      args: [searchInput.trim() as `0x${string}`],
    }] : [],
  });
  const resolvedByAddress = isAddress
    ? (addrLookup?.[0]?.result as bigint | undefined)
    : undefined;

  const targetProfileId = isUsername ? resolvedByUsername : resolvedByAddress;
  const resolving = isUsername && resolvingUsername;
  const notFound = isUsername
    ? usernameNotFound
    : isAddress && !!addrLookup && (!resolvedByAddress || resolvedByAddress === 0n);
  const canSend = !!targetProfileId && targetProfileId > 0n && targetProfileId !== profileId && !resolving;

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!targetProfileId || targetProfileId === profileId) {
      setError("User not found");
      return;
    }
    try {
      await sendRequest(targetProfileId);
      setSearchInput("");
      setSuccess(`Friend request sent!`);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleAccept = async (fromId: bigint) => {
    setError("");
    try {
      await acceptRequest(fromId);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleReject = async (fromId: bigint) => {
    try {
      await rejectRequest(fromId);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleRemove = async (friendId: bigint) => {
    try {
      await removeFriend(friendId);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const openChat = async (friendProfileId: bigint) => {
    if (!client) {
      router.push("/chat");
      return;
    }
    // Get friend wallet and open DM
    const { useOwnerOf } = await import("@/hooks/useProfile");
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
          <h1 className="text-2xl font-bold text-[#1F2937] mb-6">Friends</h1>

          {/* Send friend request */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 mb-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
            <h2 className="font-bold text-[#1F2937] text-sm mb-3">Add Friend</h2>
            <form onSubmit={handleSendRequest} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setError(""); setSuccess(""); }}
                    placeholder="@username or 0x… address"
                    className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
                  />
                  {searchInput.trim().length >= 3 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                      {resolving ? (
                        <span className="text-[#9CA3AF]">resolving…</span>
                      ) : canSend ? (
                        <span className="text-[#16A34A] font-semibold">✓ found</span>
                      ) : notFound ? (
                        <span className="text-red-500">not found</span>
                      ) : null}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isPending || !canSend}
                  className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  {isPending ? "Sending…" : "Add"}
                </button>
              </div>
              {success && <p className="text-[#16A34A] text-xs font-medium">{success}</p>}
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </form>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-[#F5EFE4] rounded-xl p-1 border border-[#E7E2D8]">
            <button
              onClick={() => setTab("friends")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === "friends" ? "bg-[#16A34A] text-white" : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setTab("requests")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === "requests"
                  ? "bg-[#16A34A] text-white"
                  : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
            >
              Requests{incoming.length > 0 ? ` (${incoming.length})` : ""}
            </button>
          </div>

          {/* Friends list */}
          {tab === "friends" && (
            <div className="space-y-2">
              {friends.length === 0 && (
                <p className="text-[#9CA3AF] text-sm py-6 text-center">No friends yet. Send a request!</p>
              )}
              {friends.map((fId) => (
                <div
                  key={fId.toString()}
                  className="flex items-center justify-between bg-white border border-[#E7E2D8] rounded-2xl p-3.5"
                  style={{ boxShadow: "0 1px 3px rgba(120,80,20,0.05)" }}
                >
                  <ProfileBadge profileId={fId} />
                  <div className="flex gap-2">
                    <FriendChatButton profileId={fId} />
                    <button
                      onClick={() => handleRemove(fId)}
                      className="text-xs text-[#9CA3AF] hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Requests */}
          {tab === "requests" && (
            <div className="space-y-4">
              {/* Incoming */}
              <div>
                <p className="text-xs text-[#9CA3AF] uppercase font-bold mb-2 tracking-wide">
                  Incoming ({incoming.length})
                </p>
                {incoming.length === 0 && (
                  <p className="text-[#9CA3AF] text-sm py-2">No incoming requests.</p>
                )}
                {incoming.map((fId) => (
                  <div
                    key={fId.toString()}
                    className="flex items-center justify-between bg-white border border-[#E7E2D8] rounded-2xl p-3.5 mb-2"
                    style={{ boxShadow: "0 1px 3px rgba(120,80,20,0.05)" }}
                  >
                    <ProfileBadge profileId={fId} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(fId)}
                        disabled={isPending}
                        className="text-xs bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-semibold transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(fId)}
                        disabled={isPending}
                        className="text-xs bg-[#F5EFE4] hover:bg-[#EDE9E0] text-[#6B7280] px-3 py-1.5 rounded-xl font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Outgoing */}
              <div>
                <p className="text-xs text-[#9CA3AF] uppercase font-bold mb-2 tracking-wide">
                  Sent ({outgoing.length})
                </p>
                {outgoing.length === 0 && (
                  <p className="text-[#9CA3AF] text-sm py-2">No pending outgoing requests.</p>
                )}
                {outgoing.map((fId) => (
                  <div
                    key={fId.toString()}
                    className="flex items-center justify-between bg-white border border-[#E7E2D8] rounded-2xl p-3.5 mb-2"
                    style={{ boxShadow: "0 1px 3px rgba(120,80,20,0.05)" }}
                  >
                    <ProfileBadge profileId={fId} />
                    <span className="text-xs text-[#9CA3AF]">Pending…</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FriendChatButton({ profileId }: { profileId: bigint }) {
  const router = useRouter();
  const { client } = useXmtp();
  const owner = useOwnerOf(profileId);

  const openDm = async () => {
    if (!owner) return;
    if (!client) {
      router.push("/chat");
      return;
    }
    const { IdentifierKind } = await import("@xmtp/browser-sdk");
    const dm = await client.conversations.createDmWithIdentifier({
      identifier: owner,
      identifierKind: IdentifierKind.Ethereum,
    });
    router.push(`/chat/${dm.id}`);
  };

  return (
    <button
      onClick={openDm}
      className="text-xs bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#16A34A] px-3 py-1.5 rounded-xl font-semibold transition-colors"
    >
      💬 Chat
    </button>
  );
}
