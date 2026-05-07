"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { VEXO_ABI, VEXO_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useCallback } from "react";

/** Access type constants matching the contract */
export const ACCESS_TYPE = {
  OPEN: 0,
  PUBLIC: 1,
  PRIVATE: 2,
} as const;

export type AccessType = (typeof ACCESS_TYPE)[keyof typeof ACCESS_TYPE];

export const ACCESS_LABEL: Record<number, string> = {
  0: "Open",
  1: "Public",
  2: "Private",
};

export const ACCESS_ICON: Record<number, string> = {
  0: "⚡",
  1: "🔓",
  2: "🔒",
};

export function useGroups(profileId?: bigint) {
  const enabled = !!profileId && profileId > 0n;

  const { data: groupIds = [], refetch } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getProfileGroups",
    args: enabled ? [profileId!] : undefined,
    query: { enabled },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  /** @param accessType 0=OPEN, 1=PUBLIC, 2=PRIVATE */
  const createGroup = useCallback(
    (name: string, accessType: number) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "createGroup",
        args: [name, accessType],
      }),
    [writeContractAsync]
  );

  /** Join an OPEN group (instant) or PUBLIC group (request) */
  const joinGroup = useCallback(
    (groupId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "joinGroup",
        args: [groupId],
      }),
    [writeContractAsync]
  );

  /** Invite to PRIVATE group (admin only) */
  const inviteMember = useCallback(
    (groupId: bigint, memberProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "inviteToGroup",
        args: [groupId, memberProfileId],
      }),
    [writeContractAsync]
  );

  const approveRequest = useCallback(
    (groupId: bigint, memberProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "approveJoinRequest",
        args: [groupId, memberProfileId],
      }),
    [writeContractAsync]
  );

  const rejectRequest = useCallback(
    (groupId: bigint, memberProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "rejectJoinRequest",
        args: [groupId, memberProfileId],
      }),
    [writeContractAsync]
  );

  const removeMember = useCallback(
    (groupId: bigint, memberProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "removeGroupMember",
        args: [groupId, memberProfileId],
      }),
    [writeContractAsync]
  );

  return {
    groupIds: groupIds as readonly bigint[],
    isPending,
    createGroup,
    joinGroup,
    inviteMember,
    approveRequest,
    rejectRequest,
    removeMember,
    refetch,
  };
}

/** Read group details by ID */
export function useGroupDetail(groupId?: bigint) {
  const enabled = !!groupId && groupId > 0n;

  const { data, refetch } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getGroup",
    args: enabled ? [groupId!] : undefined,
    query: { enabled },
  });

  const { data: members = [] } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getGroupMembers",
    args: enabled ? [groupId!] : undefined,
    query: { enabled },
  });

  const { data: pendingMembers = [] } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getPendingMembers",
    args: enabled ? [groupId!] : undefined,
    query: { enabled },
  });

  if (!data) {
    return { id: 0n, ownerProfileId: 0n, name: "", accessType: 0 as AccessType, members: [], pendingMembers: [], refetch };
  }

  const [id, ownerProfileId, name, accessType] = data as [bigint, bigint, string, number];
  return {
    id,
    ownerProfileId,
    name,
    accessType: accessType as AccessType,
    members: members as readonly bigint[],
    pendingMembers: pendingMembers as readonly bigint[],
    refetch,
  };
}
