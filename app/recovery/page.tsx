"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useMyProfile, useUsernameOf, useResolveUsername } from "@/hooks/useProfile";
import { useRecovery } from "@/hooks/useRecovery";

function GuardianChip({ profileId }: { profileId: bigint }) {
  const username = useUsernameOf(profileId);
  return (
    <span className="bg-[#F5EFE4] border border-[#E7E2D8] text-xs text-[#6B7280] px-2.5 py-1 rounded-full font-medium">
      {username ? `@${username}` : `#${profileId}`}
    </span>
  );
}

/** Inline username/address resolver input — reusable within this page */
function UsernameInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isUsername = value.trim().length > 0 && !value.trim().startsWith("0x");
  const { profileId: resolved, loading, notFound } = useResolveUsername(isUsername ? value.trim() : "");
  const found = isUsername && !!resolved && resolved > 0n;
  return (
      <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "@username"}
        className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
      />
      {isUsername && value.trim().length >= 2 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none">
          {loading ? <span className="text-[#9CA3AF]">resolving…</span>
            : found ? <span className="text-[#16A34A] font-bold">✓</span>
            : notFound ? <span className="text-red-500">✗</span>
            : null}
        </span>
      )}
    </div>
  );
}

/** Resolves @username to profileId (or undefined if not resolved yet) */
function useResolvedProfileId(input: string): bigint | undefined {
  const isUsername = input.trim().length > 0 && !input.trim().startsWith("0x");
  const { profileId } = useResolveUsername(isUsername ? input.trim() : "");
  if (!isUsername) return undefined;
  return profileId;
}

export default function RecoveryPage() {
  const { profileId, hasProfile } = useMyProfile();
  const {
    guardians,
    threshold,
    newWallet,
    approvals,
    executed,
    isPending,
    setGuardians,
    initiateRecovery,
    approveRecovery,
    refetch,
  } = useRecovery(profileId);

  const [guardianInput, setGuardianInput] = useState("");
  const [pendingGuardians, setPendingGuardians] = useState<bigint[]>([]);
  const [pendingGuardianLabels, setPendingGuardianLabels] = useState<string[]>([]);
  const [thresholdInput, setThresholdInput] = useState("1");
  const [recoveryTargetInput, setRecoveryTargetInput] = useState("");
  const [recoveryNewWallet, setRecoveryNewWallet] = useState("");
  const [approveTargetInput, setApproveTargetInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Resolve guardian input
  const guardianIsUsername = guardianInput.trim().length > 0 && !guardianInput.trim().startsWith("0x");
  const { profileId: guardianResolved, loading: guardianResolving } = useResolveUsername(
    guardianIsUsername ? guardianInput.trim() : ""
  );

  // Resolve initiate/approve inputs
  const recoveryTargetResolved = useResolvedProfileId(recoveryTargetInput);
  const approveTargetResolved = useResolvedProfileId(approveTargetInput);

  const addGuardian = () => {
    const gId = guardianIsUsername ? guardianResolved : undefined;
    if (!gId || gId <= 0n) return;
    if (!pendingGuardians.find((g) => g === gId)) {
      setPendingGuardians((prev) => [...prev, gId]);
      setPendingGuardianLabels((prev) => [...prev, guardianInput.trim()]);
    }
    setGuardianInput("");
  };

  const removeGuardian = (gId: bigint) => {
    const idx = pendingGuardians.indexOf(gId);
    setPendingGuardians((prev) => prev.filter((g) => g !== gId));
    setPendingGuardianLabels((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSetGuardians = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (pendingGuardians.length === 0) {
      setError("Add at least one guardian");
      return;
    }
    const t = BigInt(thresholdInput);
    if (t < 1n || t > BigInt(pendingGuardians.length)) {
      setError("Invalid threshold");
      return;
    }
    try {
      await setGuardians(pendingGuardians, t);
      setSuccess("Guardians saved!");
      setPendingGuardians([]);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleInitiateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const targetId = recoveryTargetResolved;
    if (!targetId || !recoveryNewWallet.startsWith("0x")) {
      setError("Enter a valid @username and new wallet address");
      return;
    }
    try {
      await initiateRecovery(targetId, recoveryNewWallet as `0x${string}`);
      setSuccess("Recovery initiated! Other guardians must now approve.");
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleApproveRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const targetId = approveTargetResolved;
    if (!targetId) { setError("Enter a valid @username"); return; }
    try {
      await approveRecovery(targetId);
      setSuccess("Recovery approved!");
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

  const hasGuardians = guardians.length > 0;
  const hasPendingRecovery =
    newWallet !== "0x0000000000000000000000000000000000000000" && !executed;

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-14 pb-20 md:pl-56 md:pb-0 px-4 bg-[#FAF7F2]">
        <div className="max-w-xl mx-auto py-8">
          <h1 className="text-2xl font-bold text-[#1F2937] mb-2">Guardian Recovery</h1>
          <p className="text-[#6B7280] text-sm mb-6">
            Assign trusted guardians who can reassign your profile to a new wallet if you lose
            access. Your identity (profileId) never changes.
          </p>

          {/* Recovery principle */}
          <div className="bg-[#F9F5EF] border border-[#E7E2D8] rounded-2xl p-4 mb-6">
            <pre className="text-xs text-[#6B7280] font-mono leading-5">{`Before recovery:
  profileId → Wallet A → XMTP inbox A

After recovery:
  profileId → Wallet B → XMTP inbox B

✔ Identity unchanged
✔ Messaging endpoint changes`}</pre>
          </div>

          {/* Current guardians */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 mb-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
            <h2 className="font-bold text-[#1F2937] mb-1">Your Guardians</h2>
            {!hasGuardians ? (
              <p className="text-[#9CA3AF] text-sm">No guardians set.</p>
            ) : (
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {guardians.map((gId) => (
                    <GuardianChip key={gId.toString()} profileId={gId} />
                  ))}
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Threshold: {threshold.toString()}-of-{guardians.length}
                </p>
              </div>
            )}
          </div>

          {/* Set / update guardians */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 mb-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
            <h2 className="font-bold text-[#1F2937] mb-3">
              {hasGuardians ? "Update Guardians" : "Set Guardians"}
            </h2>

            <div className="flex gap-2 mb-3">
              <UsernameInput
                value={guardianInput}
                onChange={setGuardianInput}
                placeholder="@username of guardian"
              />
              <button
                onClick={addGuardian}
                type="button"
                disabled={guardianResolving || !guardianResolved || guardianResolved <= 0n}
                className="bg-[#F5EFE4] hover:bg-[#EDE9E0] disabled:opacity-50 text-[#1F2937] text-sm px-4 py-2.5 rounded-xl border border-[#E7E2D8] font-semibold transition-colors"
              >
                Add
              </button>
            </div>

            {pendingGuardians.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#9CA3AF] mb-1">Pending guardians:</p>
                <div className="flex flex-wrap gap-2">
                  {pendingGuardians.map((gId, i) => (
                    <button
                      key={gId.toString()}
                      onClick={() => removeGuardian(gId)}
                      className="bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] text-xs px-2.5 py-1 rounded-full hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                    >
                      {pendingGuardianLabels[i] ?? `#${gId}`} ✕
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSetGuardians} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#9CA3AF]">Threshold</label>
                <input
                  type="number"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  min="1"
                  max={pendingGuardians.length || 1}
                  className="w-16 bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-2 py-1.5 rounded-xl focus:outline-none focus:border-[#16A34A] transition-colors"
                />
                <span className="text-xs text-[#9CA3AF]">of {pendingGuardians.length}</span>
              </div>
              <button
                type="submit"
                disabled={isPending || pendingGuardians.length === 0}
                className="ml-auto bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
              >
                {isPending ? "Saving…" : "Save Guardians"}
              </button>
            </form>
          </div>

          {/* Active recovery request */}
          {hasPendingRecovery && (
            <div className="bg-[#FEFCE8] border border-[#FEF08A] rounded-2xl p-4 mb-5">
              <h2 className="font-bold text-[#854D0E] mb-2">⚠ Recovery In Progress</h2>
              <p className="text-xs text-[#6B7280] mb-1">
                New wallet: <span className="font-mono text-[#1F2937]">{newWallet}</span>
              </p>
              <p className="text-xs text-[#6B7280]">
                Approvals: {approvals.toString()} / {threshold.toString()} needed
              </p>
            </div>
          )}

          {/* Initiate recovery (as guardian for someone else) */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 mb-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
            <h2 className="font-bold text-[#1F2937] mb-3">Initiate Recovery (as Guardian)</h2>
            <form onSubmit={handleInitiateRecovery} className="space-y-3">
              <UsernameInput
                value={recoveryTargetInput}
                onChange={setRecoveryTargetInput}
                placeholder="@username of account to recover"
              />
              <input
                type="text"
                value={recoveryNewWallet}
                onChange={(e) => setRecoveryNewWallet(e.target.value)}
                placeholder="0x… new wallet address"
                className="w-full bg-[#F5EFE4] border border-[#E7E2D8] text-[#1F2937] text-sm px-3 py-2.5 rounded-xl focus:outline-none font-mono focus:border-[#16A34A] focus:bg-white transition-colors placeholder:text-[#9CA3AF]"
              />
              <button
                type="submit"
                disabled={isPending || !recoveryTargetResolved || !recoveryNewWallet.startsWith("0x")}
                className="w-full bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                {isPending ? "Sending…" : "Initiate Recovery"}
              </button>
            </form>
          </div>

          {/* Approve recovery */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(120,80,20,0.06)" }}>
            <h2 className="font-bold text-[#1F2937] mb-3">Approve Recovery</h2>
            <form onSubmit={handleApproveRecovery} className="flex gap-2">
              <UsernameInput
                value={approveTargetInput}
                onChange={setApproveTargetInput}
                placeholder="@username to approve recovery for"
              />
              <button
                type="submit"
                disabled={isPending || !approveTargetResolved}
                className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl border-0 transition-colors"
              >
                {isPending ? "Approving…" : "Approve"}
              </button>
            </form>
          </div>

          {success && <p className="text-[#16A34A] text-xs mt-4 font-medium">{success}</p>}
          {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
        </div>
      </div>
    </>
  );
}
