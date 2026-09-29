export type CardKind =
  | "personal"
  | "business"
  | "creator"
  | "event"
  | "community"
  | "professional"
  | "custom";

export type DiceStyle =
  | "noun"
  | "lorelei"
  | "adventurer"
  | "notionists"
  | "dylan"
  | "croodles"
  | "glass";

export type CardLink = {
  id: string;
  label: string;
  url: string;
};

export type VexoCard = {
  id: string;
  userId: string;
  kind: CardKind;
  slug: string;
  displayName: string;
  title: string;
  bio: string;
  location?: string;
  website?: string;
  avatarStyle: DiceStyle;
  avatarSeed: string;
  avatarGender?: "male" | "female" | "unspecified";
  links: CardLink[];
  isPrimary: boolean;
  updatedAt: string;
};

export type EncryptedVault = {
  ciphertext: string;
  iv: string;
  salt: string;
  publicKey: string;
  version: 1;
};

export type SelfDisclosures = {
  name?: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  expiryDate?: string;
  issuingState?: string;
};

export type SelfProof = {
  sessionId: string;
  status: "pending" | "valid" | "invalid" | "error" | "expired";
  verifiedAt?: string;
  nullifier?: string;
  disclosures?: SelfDisclosures;
};

export type GoodDollarProof = {
  address: string;
  isWhitelisted: boolean;
  root: string;
  verifiedAt?: string;
};

export type WalletMint = {
  apple?: string;
  google?: string;
  samsung?: string;
};

export type PasskeyWallet = {
  credentialId: string;
  publicKey: `0x${string}`;
  publicKeySpki?: string;
  address: `0x${string}`;
  kernelAddress?: `0x${string}`;
  createdAt: string;
};

export type PasskeyBiodata = {
  name: string;
  extra: Record<string, unknown>;
};

export type PasskeyCardVault = {
  v: 1;
  wallet: PasskeyWallet;
  username: string;
  displayName: string;
  avatarStyle: DiceStyle;
  avatarSeed: string;
  avatarGender?: VexoCard["avatarGender"];
  biodata?: PasskeyBiodata;
};

export type VexoUser = {
  id: string;
  privyId?: string;
  username: string;
  displayName: string;
  createdAt: string;
  vault: EncryptedVault;
  onboardingComplete: boolean;
  passkeyWallet?: PasskeyWallet;
  passkeyBiodata?: PasskeyBiodata;
  humanity?: {
    self?: SelfProof;
    gooddollar?: GoodDollarProof;
  };
  walletMints?: WalletMint;
  celoAddress?: string;
};

export type ProofOfMeet = {
  id: string;
  aUserId: string;
  bUserId: string;
  aCardId: string;
  bCardId?: string;
  eventName?: string;
  place?: string;
  createdAt: string;
  hash: string;
};

export type Connection = {
  id: string;
  meetId: string;
  peerUserId: string;
  peerCardId: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  fromUserId: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
};

export type Thread = {
  id: string;
  meetId: string;
  memberIds: [string, string];
};

export type MeetInvite = {
  id: string;
  fromUserId: string;
  cardId: string;
  eventName?: string;
  createdAt: string;
};

export type AppState = {
  users: VexoUser[];
  cards: VexoCard[];
  currentUserId: string | null;
  proofs: ProofOfMeet[];
  connections: Connection[];
  threads: Thread[];
  messages: ChatMessage[];
  invites: MeetInvite[];
  wrappingKeyHint: string | null;
};
