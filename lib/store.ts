import { createIdentityVault, hashProof, randomId, slugify } from "./crypto";
import { usernameSlug } from "./username";
import type {
  AppState,
  CardKind,
  ChatMessage,
  DiceStyle,
  EncryptedVault,
  GoodDollarProof,
  PasskeyWallet,
  SelfProof,
  VexoCard,
  VexoUser,
  WalletMint,
} from "./types";

const STORAGE_KEY = "vexo-social-v1";

const empty: AppState = {
  users: [],
  cards: [],
  currentUserId: null,
  proofs: [],
  connections: [],
  threads: [],
  messages: [],
  invites: [],
  wrappingKeyHint: null,
};

let memory = empty;
const listeners = new Set<() => void>();
let pendingVault: EncryptedVault | null = null;
let pendingSecret: string | null = null;

function emit() {
  listeners.forEach((fn) => fn());
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  emit();
}

function load(): AppState {
  if (typeof window === "undefined") return empty;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return empty;
  try {
    return { ...empty, ...(JSON.parse(raw) as AppState) };
  } catch {
    return empty;
  }
}

function stubVault(): EncryptedVault {
  return {
    ciphertext: "",
    iv: "",
    salt: "",
    publicKey: "{}",
    version: 1,
  };
}

function ensureSeed() {
  if (memory.users.some((u) => u.username === "sarah")) return;

  const sarah: VexoUser = {
    id: "user_sarah",
    username: "sarah",
    displayName: "Sarah Okello",
    createdAt: new Date().toISOString(),
    vault: stubVault(),
    onboardingComplete: true,
  };
  const brian: VexoUser = {
    id: "user_brian",
    username: "brian",
    displayName: "Brian Mensah",
    createdAt: new Date().toISOString(),
    vault: stubVault(),
    onboardingComplete: true,
  };

  const sarahCard: VexoCard = {
    id: "card_sarah",
    userId: sarah.id,
    kind: "creator",
    slug: "personal",
    displayName: "Sarah Okello",
    title: "Community · ETH Nile",
    bio: "I connect builders across East Africa. If we met, this is the card to keep.",
    location: "Kampala",
    website: "https://ethnile.xyz",
    avatarStyle: "lorelei",
    avatarSeed: "sarah-okello",
    links: [
      { id: "l1", label: "Farcaster", url: "https://warpcast.com/sarah" },
      { id: "l2", label: "Site", url: "https://ethnile.xyz" },
    ],
    isPrimary: true,
    updatedAt: new Date().toISOString(),
  };

  const brianCard: VexoCard = {
    id: "card_brian",
    userId: brian.id,
    kind: "professional",
    slug: "personal",
    displayName: "Brian Mensah",
    title: "Protocol engineer",
    bio: "Shipping infrastructure. Happy to continue the conversation after we meet.",
    location: "Accra",
    avatarStyle: "adventurer",
    avatarSeed: "brian-mensah",
    links: [{ id: "l1", label: "GitHub", url: "https://github.com" }],
    isPrimary: true,
    updatedAt: new Date().toISOString(),
  };

  memory = {
    ...memory,
    users: [...memory.users, sarah, brian],
    cards: [...memory.cards, sarahCard, brianCard],
  };
  persist();
}

export function getState() {
  return memory;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hydrate() {
  memory = load();
  ensureSeed();
  emit();
}

export function wrappingSecret() {
  return memory.wrappingKeyHint ?? "vexo-local-device";
}

export async function signInLocal(privyId?: string) {
  if (privyId) {
    const existing = memory.users.find((u) => u.privyId === privyId);
    if (existing) {
      memory = {
        ...memory,
        currentUserId: existing.id,
        wrappingKeyHint: privyId,
      };
      persist();
      return existing;
    }
  }

  if (memory.currentUserId) {
    return currentUser();
  }

  memory = {
    ...memory,
    wrappingKeyHint: privyId ?? memory.wrappingKeyHint ?? randomId(12),
  };
  persist();
  return currentUser();
}

export function signOut() {
  memory = { ...memory, currentUserId: null };
  persist();
}

export function currentUser() {
  return memory.users.find((u) => u.id === memory.currentUserId) ?? null;
}

export function knownPasskeyIds() {
  return memory.users
    .map((user) => user.passkeyWallet?.credentialId)
    .filter((id): id is string => Boolean(id));
}

export function userByCredentialId(credentialId: string) {
  const needle = credentialId.replace(/=+$/, "");
  return (
    memory.users.find(
      (user) => user.passkeyWallet?.credentialId.replace(/=+$/, "") === needle,
    ) ?? null
  );
}

export function activatePasskeySession(credentialId: string) {
  const user = userByCredentialId(credentialId);
  if (!user?.passkeyWallet) {
    throw new Error(
      "Face ID found a passkey, but this browser has no card cache. Create the card on this device, or open Vexo on the phone that minted it. We do not keep accounts on a server.",
    );
  }
  memory = { ...memory, currentUserId: user.id };
  persist();
  return user;
}

export function cardsFor(userId: string) {
  return memory.cards.filter((c) => c.userId === userId);
}

export function primaryCard(userId: string) {
  return cardsFor(userId).find((c) => c.isPrimary) ?? cardsFor(userId)[0];
}

export function userByUsername(username: string) {
  return memory.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function cardByPath(username: string, slug?: string) {
  const user = userByUsername(username);
  if (!user) return null;
  const cards = cardsFor(user.id);
  if (!slug) return cards.find((c) => c.isPrimary) ?? cards[0] ?? null;
  return cards.find((c) => c.slug === slug) ?? null;
}

export async function prewarmVault() {
  const secret = wrappingSecret();
  if (pendingVault && pendingSecret === secret) return;
  const created = await createIdentityVault(secret);
  pendingVault = created.vault;
  pendingSecret = secret;
}

export async function completeOnboarding(input: {
  userId?: string;
  username: string;
  displayName: string;
  avatarStyle: DiceStyle;
  avatarSeed: string;
  avatarGender?: VexoCard["avatarGender"];
  passkeyWallet: PasskeyWallet;
}) {
  const username = usernameSlug(input.username);
  if (!username) throw new Error("Choose a username");

  const existing = userByCredentialId(input.passkeyWallet.credentialId);
  if (existing) {
    memory = { ...memory, currentUserId: existing.id };
    persist();
    bindPasskeyWallet(input.passkeyWallet);
    return existing;
  }

  if (memory.users.some((u) => u.username === username && u.id !== memory.currentUserId)) {
    throw new Error("That username is taken");
  }

  const secret = wrappingSecret();
  const vault =
    pendingVault && pendingSecret === secret
      ? pendingVault
      : (await createIdentityVault(secret)).vault;
  pendingVault = null;
  pendingSecret = null;
  const userId = input.userId ?? randomId(12);
  const cardId = randomId(12);
  const now = new Date().toISOString();

  const user: VexoUser = {
    id: userId,
    privyId: secret.startsWith("did:privy") ? secret : undefined,
    username,
    displayName: input.displayName,
    createdAt: now,
    vault,
    onboardingComplete: true,
    passkeyWallet: input.passkeyWallet,
    humanity: {},
    walletMints: {},
  };

  const card: VexoCard = {
    id: cardId,
    userId,
    kind: "personal",
    slug: "personal",
    displayName: input.displayName,
    title: "",
    bio: "",
    avatarStyle: input.avatarStyle,
    avatarSeed: input.avatarSeed,
    avatarGender: input.avatarGender,
    links: [],
    isPrimary: true,
    updatedAt: now,
  };

  memory = {
    ...memory,
    users: [...memory.users, user],
    cards: [...memory.cards, card],
    currentUserId: userId,
    wrappingKeyHint: secret,
  };
  persist();
  return user;
}

export function updatePrimaryCard(patch: Partial<VexoCard>) {
  const user = currentUser();
  if (!user) return;
  const card = primaryCard(user.id);
  if (!card) return;
  memory = {
    ...memory,
    cards: memory.cards.map((c) =>
      c.id === card.id
        ? { ...c, ...patch, updatedAt: new Date().toISOString() }
        : c,
    ),
    users: memory.users.map((u) =>
      u.id === user.id && patch.displayName
        ? { ...u, displayName: patch.displayName }
        : u,
    ),
  };
  persist();
}

export function addCard(input: {
  kind: CardKind;
  slug: string;
  displayName: string;
  title: string;
  bio: string;
  avatarStyle: DiceStyle;
  avatarSeed: string;
}) {
  const user = currentUser();
  if (!user) return;
  const slug = slugify(input.slug) || input.kind;
  const card: VexoCard = {
    id: randomId(12),
    userId: user.id,
    kind: input.kind,
    slug,
    displayName: input.displayName,
    title: input.title,
    bio: input.bio,
    avatarStyle: input.avatarStyle,
    avatarSeed: input.avatarSeed,
    links: [],
    isPrimary: false,
    updatedAt: new Date().toISOString(),
  };
  memory = { ...memory, cards: [...memory.cards, card] };
  persist();
  return card;
}

export async function mintMeet(input: {
  peerUserId: string;
  peerCardId: string;
  eventName?: string;
  place?: string;
}) {
  const me = currentUser();
  if (!me) throw new Error("Sign in first");
  const myCard = primaryCard(me.id);
  if (!myCard) throw new Error("Create a card first");
  if (input.peerUserId === me.id) throw new Error("You cannot meet yourself");

  const existing = memory.proofs.find(
    (p) =>
      (p.aUserId === me.id && p.bUserId === input.peerUserId) ||
      (p.bUserId === me.id && p.aUserId === input.peerUserId),
  );
  if (existing) return existing;

  const createdAt = new Date().toISOString();
  const canonical = JSON.stringify({
    a: me.id,
    b: input.peerUserId,
    card: input.peerCardId,
    event: input.eventName ?? "",
    ts: createdAt,
  });
  const proof = {
    id: randomId(12),
    aUserId: me.id,
    bUserId: input.peerUserId,
    aCardId: myCard.id,
    bCardId: input.peerCardId,
    eventName: input.eventName,
    place: input.place,
    createdAt,
    hash: await hashProof(canonical),
  };

  const threadId = randomId(12);
  memory = {
    ...memory,
    proofs: [...memory.proofs, proof],
    connections: [
      ...memory.connections,
      {
        id: randomId(12),
        meetId: proof.id,
        peerUserId: input.peerUserId,
        peerCardId: input.peerCardId,
        createdAt,
      },
    ],
    threads: [
      ...memory.threads,
      { id: threadId, meetId: proof.id, memberIds: [me.id, input.peerUserId] },
    ],
  };
  persist();
  return proof;
}

export function threadForMeet(meetId: string) {
  return memory.threads.find((t) => t.meetId === meetId);
}

export function threadById(id: string) {
  return memory.threads.find((t) => t.id === id);
}

export function messagesFor(threadId: string) {
  return memory.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function pushMessage(message: ChatMessage) {
  memory = { ...memory, messages: [...memory.messages, message] };
  persist();
}

export function meetsForCurrentUser() {
  const me = currentUser();
  if (!me) return [];
  return memory.proofs
    .filter((p) => p.aUserId === me.id || p.bUserId === me.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function peerOf(proof: AppState["proofs"][number], userId: string) {
  const peerId = proof.aUserId === userId ? proof.bUserId : proof.aUserId;
  const peer = memory.users.find((u) => u.id === peerId);
  const peerCardId = proof.aUserId === userId ? proof.bCardId : proof.aCardId;
  const card = memory.cards.find((c) => c.id === peerCardId) ?? primaryCard(peerId);
  return { peer, card };
}

export function discoverablePeople() {
  const me = currentUser();
  return memory.users.filter((u) => u.onboardingComplete && u.id !== me?.id);
}

function patchCurrentUser(patch: Partial<VexoUser>) {
  const me = currentUser();
  if (!me) return;
  memory = {
    ...memory,
    users: memory.users.map((u) => (u.id === me.id ? { ...u, ...patch } : u)),
  };
  persist();
}

export function saveSelfProof(proof: SelfProof) {
  const me = currentUser();
  if (!me) return;
  const disclosures = proof.disclosures;
  const displayName = disclosures?.name || me.displayName;
  const gender = mapSelfGender(disclosures?.gender);

  patchCurrentUser({
    displayName,
    humanity: { ...me.humanity, self: proof },
  });

  const card = primaryCard(me.id);
  if (!card) return;
  memory = {
    ...memory,
    cards: memory.cards.map((item) =>
      item.id === card.id
        ? {
            ...item,
            displayName,
            location: disclosures?.nationality || item.location,
            avatarGender: gender ?? item.avatarGender,
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  };
  persist();
}

function mapSelfGender(
  value?: string,
): VexoCard["avatarGender"] | undefined {
  if (!value) return undefined;
  const letter = value.trim().toUpperCase();
  if (letter.startsWith("M")) return "male";
  if (letter.startsWith("F")) return "female";
  return "unspecified";
}

export function saveGoodDollarProof(proof: GoodDollarProof) {
  const me = currentUser();
  if (!me) return;
  patchCurrentUser({
    humanity: { ...me.humanity, gooddollar: proof },
    celoAddress: proof.address,
  });
}

export function bindPasskeyWallet(wallet: PasskeyWallet) {
  patchCurrentUser({ passkeyWallet: wallet });
}

export function mintCardToWallet(platform: keyof WalletMint) {
  const me = currentUser();
  if (!me) return;
  if (!me.passkeyWallet) {
    throw new Error("Create a passkey wallet first.");
  }
  patchCurrentUser({
    walletMints: {
      ...me.walletMints,
      [platform]: new Date().toISOString(),
    },
  });
}

export function isHuman(user: VexoUser | null | undefined) {
  if (!user?.humanity) return false;
  return (
    user.humanity.self?.status === "valid" ||
    user.humanity.gooddollar?.isWhitelisted === true
  );
}

export function canMintPass(user: VexoUser | null | undefined) {
  return Boolean(user?.passkeyWallet);
}
