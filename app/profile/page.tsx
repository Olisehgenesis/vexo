"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Navigation } from "@/components/Navigation";
import { useMyProfile, useCreateProfile, useSetUsername } from "@/hooks/useProfile";
import { useXmtp } from "@/hooks/useXmtp";

export default function ProfilePage() {
  const { address } = useAccount();
  const { profileId, hasProfile, username, refetch } = useMyProfile();
  const { create, isPending: creating } = useCreateProfile();
  const { setUsername, isPending: settingName } = useSetUsername();
  const { client, connect, isConnecting } = useXmtp();

  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async () => {
    setError("");
    try {
      await create();
      refetch();
      setSuccess("Profile created!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newUsername.trim()) return;
    try {
      await setUsername(newUsername.trim().toLowerCase());
      setNewUsername("");
      refetch();
      setSuccess("Username updated!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-14 pb-20 md:pl-56 md:pb-0 px-4 bg-[#FAF7F2]">
        <div className="max-w-xl mx-auto py-8">
          <h1 className="text-2xl font-bold text-[#1F2937] mb-6">Profile</h1>

          {!address && (
            <p className="text-[#9CA3AF]">Connect your wallet to view your profile.</p>
          )}

          {address && !hasProfile && (
            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
              <h2 className="font-bold text-[#1F2937] mb-2">No profile found</h2>
              <p className="text-[#6B7280] text-sm mb-4">
                Create your soulbound vexoSocial identity on Celo.
              </p>
              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={creating}
                className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl transition-colors"
              >
                {creating ? "Creating…" : "Create Profile"}
              </button>
            </div>
          )}

          {address && hasProfile && (
            <div className="flex flex-col gap-5">
              {/* Identity card */}
              <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#DCFCE7] flex items-center justify-center text-2xl font-bold text-[#16A34A]">
                    {username ? username[0].toUpperCase() : profileId.toString().slice(-2)}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#1F2937]">
                      {username ? `@${username}` : "No username"}
                    </p>
                    <p className="text-sm text-[#9CA3AF]">Profile #{profileId.toString()}</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm border-t border-[#E7E2D8] pt-3">
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Wallet</span>
                    <span className="text-[#1F2937] font-mono text-xs">
                      {address.slice(0, 6)}…{address.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Profile ID</span>
                    <span className="text-[#1F2937] font-mono">{profileId.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Network</span>
                    <span className="text-[#1F2937]">Celo Mainnet</span>
                  </div>
                </div>
              </div>

              {/* Set username */}
              <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
                <h2 className="font-bold text-[#1F2937] mb-1">
                  {username ? "Change Username" : "Set Username"}
                </h2>
                <p className="text-[#9CA3AF] text-xs mb-4">3–32 chars, unique across vexoSocial</p>

                <form onSubmit={handleSetUsername} className="flex gap-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="newusername"
                    minLength={3}
                    maxLength={32}
                    className="flex-1 bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
                  />
                  <button
                    type="submit"
                    disabled={settingName || !newUsername.trim()}
                    className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
                  >
                    {settingName ? "Saving…" : "Save"}
                  </button>
                </form>

                {success && <p className="text-[#16A34A] text-xs mt-2 font-medium">{success}</p>}
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              </div>

              {/* XMTP connection */}
              <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
                <h2 className="font-bold text-[#1F2937] mb-1">XMTP Messaging</h2>
                <p className="text-[#9CA3AF] text-xs mb-3">
                  Encrypted messaging via XMTP v3 (MLS). Bound to your current wallet.
                </p>
                {client ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block" />
                    <span className="text-[#16A34A] text-sm font-medium">Connected to XMTP</span>
                  </div>
                ) : (
                  <button
                    onClick={connect}
                    disabled={isConnecting}
                    className="bg-[#F5EFE4] hover:bg-[#EDE9E0] disabled:opacity-50 text-[#1F2937] text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors border border-[#E7E2D8]"
                  >
                    {isConnecting ? "Connecting…" : "Connect to XMTP"}
                  </button>
                )}
              </div>

              {/* UX reminder */}
              <div className="bg-[#F9F5EF] border border-[#E7E2D8] rounded-2xl p-4">
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  <span className="text-[#16A34A] font-semibold">Note:</span> Your profileId is
                  permanent. If you change wallets via guardian recovery, your messaging inbox will
                  also change — but your identity remains the same.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
