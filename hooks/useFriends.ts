"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { VEXO_ABI, VEXO_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useCallback } from "react";

export function useFriends(profileId?: bigint) {
  const enabled = !!profileId && profileId > 0n;

  const { data: friends = [], refetch: refetchFriends } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getFriends",
    args: enabled ? [profileId!] : undefined,
    query: { enabled },
  });

  const { data: incoming = [], refetch: refetchIncoming } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getIncomingRequests",
    args: enabled ? [profileId!] : undefined,
    query: { enabled },
  });

  const { data: outgoing = [], refetch: refetchOutgoing } = useReadContract({
    address: VEXO_CONTRACT_ADDRESS,
    abi: VEXO_ABI,
    functionName: "getOutgoingRequests",
    args: enabled ? [profileId!] : undefined,
    query: { enabled },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const sendRequest = useCallback(
    (toProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "sendFriendRequest",
        args: [toProfileId],
      }),
    [writeContractAsync]
  );

  const acceptRequest = useCallback(
    (fromProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "acceptFriendRequest",
        args: [fromProfileId],
      }),
    [writeContractAsync]
  );

  const rejectRequest = useCallback(
    (fromProfileId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "rejectFriendRequest",
        args: [fromProfileId],
      }),
    [writeContractAsync]
  );

  const removeFriend = useCallback(
    (friendId: bigint) =>
      writeContractAsync({
        address: VEXO_CONTRACT_ADDRESS,
        abi: VEXO_ABI,
        functionName: "removeFriend",
        args: [friendId],
      }),
    [writeContractAsync]
  );

  const refetch = useCallback(() => {
    refetchFriends();
    refetchIncoming();
    refetchOutgoing();
  }, [refetchFriends, refetchIncoming, refetchOutgoing]);

  return {
    friends: friends as readonly bigint[],
    incoming: incoming as readonly bigint[],
    outgoing: outgoing as readonly bigint[],
    isPending,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refetch,
  };
}
