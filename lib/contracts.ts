// VexoCore contract ABI + address config

export const VEXO_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_VEXO_CONTRACT_ADDRESS as `0x${string}`) ??
  "0x0000000000000000000000000000000000000000";

export const VEXO_ABI = [
  // ─── PROFILE ─────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "nextProfileId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "profileOf",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createProfile",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "profileId", type: "uint256" }],
  },
  // ─── USERNAME ─────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "usernameOf",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "usernameHashToProfile",
    stateMutability: "view",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "setUsername",
    stateMutability: "nonpayable",
    inputs: [{ name: "username", type: "string" }],
    outputs: [],
  },
  // ─── SOCIAL GRAPH ─────────────────────────────────────────────────────────
  {
    type: "function",
    name: "isFriend",
    stateMutability: "view",
    inputs: [
      { name: "profileId", type: "uint256" },
      { name: "otherId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "hasSentRequest",
    stateMutability: "view",
    inputs: [
      { name: "from", type: "uint256" },
      { name: "to", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getFriends",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getIncomingRequests",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getOutgoingRequests",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "sendFriendRequest",
    stateMutability: "nonpayable",
    inputs: [{ name: "toProfileId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptFriendRequest",
    stateMutability: "nonpayable",
    inputs: [{ name: "fromProfileId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rejectFriendRequest",
    stateMutability: "nonpayable",
    inputs: [{ name: "fromProfileId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeFriend",
    stateMutability: "nonpayable",
    inputs: [{ name: "friendId", type: "uint256" }],
    outputs: [],
  },
  // ─── GROUPS ───────────────────────────────────────────────────────────────
  // accessType: 0=OPEN, 1=PUBLIC, 2=PRIVATE
  {
    type: "function",
    name: "nextGroupId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isGroupMember",
    stateMutability: "view",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isGroupAdmin",
    stateMutability: "view",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "joinRequests",
    stateMutability: "view",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getGroup",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "ownerProfileId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "accessType", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "getGroupMembers",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getPendingMembers",
    stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getProfileGroups",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "createGroup",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "accessType", type: "uint8" },
    ],
    outputs: [{ name: "groupId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinGroup",
    stateMutability: "nonpayable",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "approveJoinRequest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "rejectJoinRequest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "inviteToGroup",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "addGroupAdmin",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "removeGroupMember",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "profileId", type: "uint256" },
    ],
    outputs: [],
  },
  // ─── RECOVERY ─────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "recoveryThreshold",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "recoveryApproved",
    stateMutability: "view",
    inputs: [
      { name: "profileId", type: "uint256" },
      { name: "guardianId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getGuardians",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [
      { name: "guardians", type: "uint256[]" },
      { name: "threshold", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getRecoveryRequest",
    stateMutability: "view",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [
      { name: "newWallet", type: "address" },
      { name: "approvals", type: "uint256" },
      { name: "executed", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "setGuardians",
    stateMutability: "nonpayable",
    inputs: [
      { name: "guardianProfileIds", type: "uint256[]" },
      { name: "threshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "initiateRecovery",
    stateMutability: "nonpayable",
    inputs: [
      { name: "profileId", type: "uint256" },
      { name: "newWallet", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approveRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "profileId", type: "uint256" }],
    outputs: [],
  },
  // ─── EVENTS ───────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "ProfileCreated",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "UsernameSet",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "username", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FriendRequestSent",
    inputs: [
      { name: "from", type: "uint256", indexed: true },
      { name: "to", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "FriendAccepted",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "friendId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "FriendRemoved",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "friendId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "GroupCreated",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "ownerProfileId", type: "uint256", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "accessType", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MemberAdded",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "profileId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "MemberRemoved",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "profileId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "JoinRequested",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "profileId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "JoinApproved",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "profileId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "JoinRejected",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "profileId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AdminAdded",
    inputs: [
      { name: "groupId", type: "uint256", indexed: true },
      { name: "profileId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "GuardiansSet",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "threshold", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RecoveryInitiated",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "newWallet", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RecoveryApproved",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "guardianId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "RecoveryExecuted",
    inputs: [
      { name: "profileId", type: "uint256", indexed: true },
      { name: "oldWallet", type: "address", indexed: true },
      { name: "newWallet", type: "address", indexed: true },
    ],
  },
] as const;
