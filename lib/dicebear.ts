import type { DiceStyle } from "./types";

export type AvatarGender = "male" | "female" | "unspecified";

export const DICE_STYLES: { id: DiceStyle; label: string }[] = [
  { id: "noun", label: "Noun" },
];

export function stylesForGender(_gender: AvatarGender): DiceStyle[] {
  return ["noun"];
}

export function nounIdFromSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 900;
}

/** Official Nouns art via the public noun.pics CDN. */
export function nounsUrl(seed: string, size = 160) {
  const id = nounIdFromSeed(seed);
  return `https://noun.pics/${id}`;
}

export function nounLooks(base: string) {
  return Array.from({ length: 8 }, (_, i) => `${base}·${i + 1}`);
}

export function dicebearUrl(
  _style: DiceStyle | string,
  seed: string,
  size = 160,
  _gender: AvatarGender = "unspecified",
) {
  return nounsUrl(seed, size);
}
