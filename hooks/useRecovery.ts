"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { VEXO_ABI, VEXO_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useCallback } from "react";

export function useRecovery(profileId?: bigint) {
  const enabled = !!profileId && profileId > 0n;

  const { data: guardiansData, refetch: refetchGuardians } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getGuardians",
    args: enabled ? [profileId!] : undefined,
    query: { enabled },
  });

  const { data: requestData, refetch: refetchRequest } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getRecoveryRequest",
    args: enabled ? [profileId!] : undefined,
    query: { enabled },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const setGuardians = useCallback(
    (guardianProfileIds: bigint[], threshold: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "setGuardians",
        args: [guardianProfileIds, threshold],
      }),
    [writeContractAsync]
  );

  const initiateRecovery = useCallback(
    (targetProfileId: bigint, newWallet: `0x${string}`) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "initiateRecovery",
        args: [targetProfileId, newWallet],
      }),
    [writeContractAsync]
  );

  const approveRecovery = useCallback(
    (targetProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "approveRecovery",
        args: [targetProfileId],
      }),
    [writeContractAsync]
  );

  const refetch = () => { refetchGuardians(); refetchRequest(); };

  const [guardians, threshold] = (guardiansData as [readonly bigint[], bigint]) ?? [[], 0n];
  const [newWallet, approvals, executed] = (requestData as [`0x${string}`, bigint, boolean]) ?? [
    "0x0000000000000000000000000000000000000000",
    0n,
    false,
  ];

  return {
    guardians: guardians ?? [],
    threshold: threshold ?? 0n,
    newWallet,
    approvals: approvals ?? 0n,
    executed: executed ?? false,
    isPending,
    setGuardians,
    initiateRecovery,
    approveRecovery,
    refetch,
  };
}
