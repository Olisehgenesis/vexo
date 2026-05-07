"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { keccak256, toBytes } from "viem";
import { VEXO_ABI, VEXO_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useCallback } from "react";

/** Read-only: resolve a wallet address → profileId + username */
export function useProfileByAddress(address?: `0x${string}`) {
  const { data: profileId, refetch: refetchId } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "profileOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: username, refetch: refetchUsername } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "usernameOf",
    args: profileId && profileId > 0n ? [profileId] : undefined,
    query: { enabled: !!profileId && profileId > 0n },
  });

  return {
    profileId: profileId ?? 0n,
    hasProfile: !!profileId && profileId > 0n,
    username: username ?? "",
    refetch: () => { refetchId(); refetchUsername(); },
  };
}

/** Read-only: resolve profileId → wallet address */
export function useOwnerOf(profileId?: bigint) {
  const { data } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "ownerOf",
    args: profileId && profileId > 0n ? [profileId] : undefined,
    query: { enabled: !!profileId && profileId > 0n },
  });
  return data as `0x${string}` | undefined;
}

/** Read-only: get username for a profileId */
export function useUsernameOf(profileId?: bigint) {
  const { data } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "usernameOf",
    args: profileId && profileId > 0n ? [profileId] : undefined,
    query: { enabled: !!profileId && profileId > 0n },
  });
  return (data as string) ?? "";
}

/** Current user's profile (from connected wallet) */
export function useMyProfile() {
  const { address } = useAccount();
  return useProfileByAddress(address);
}

/** Write: create a profile */
export function useCreateProfile() {
  const { writeContractAsync, isPending } = useWriteContract();
  const create = useCallback(async () => {
    return writeContractAsync({
      address: VEXO_CONTRACT_ADDRESS,
      abi: VEXO_ABI,
      functionName: "createProfile",
    });
  }, [writeContractAsync]);
  return { create, isPending };
}

/** Write: set / update username */
export function useSetUsername() {
  const { writeContractAsync, isPending } = useWriteContract();
  const setUsername = useCallback(
    async (username: string) => {
      return writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "setUsername",
        args: [username],
      });
    },
    [writeContractAsync]
  );
  return { setUsername, isPending };
}

/**
 * Resolve a @username → wallet address via the contract.
 * Pass a username string (with or without leading @).
 * Returns { address, profileId, loading, notFound }.
 */
export function useResolveUsername(username: string) {
  const cleaned = username.startsWith("@") ? username.slice(1) : username;
  const isValid = cleaned.length >= 3 && cleaned.length <= 32;
  const hash = isValid ? keccak256(toBytes(cleaned)) : undefined;

  const { data: resolvedProfileId, isLoading: loadingId } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "usernameHashToProfile",
    args: hash ? [hash] : undefined,
    query: { enabled: !!hash },
  });

  const profileId =
    resolvedProfileId && (resolvedProfileId as bigint) > 0n
      ? (resolvedProfileId as bigint)
      : undefined;

  const { data: resolvedAddress, isLoading: loadingAddr } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "ownerOf",
    args: profileId ? [profileId] : undefined,
    query: { enabled: !!profileId },
  });

  return {
    address: resolvedAddress as `0x${string}` | undefined,
    profileId,
    loading: loadingId || loadingAddr,
    notFound: !!hash && !loadingId && !loadingAddr && !profileId,
  };
}
