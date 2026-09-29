export type NounSeed = {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
};

export function isNounSeed(value: unknown): value is NounSeed {
  if (!value || typeof value !== "object") return false;
  const seed = value as NounSeed;
  return [seed.background, seed.body, seed.accessory, seed.head, seed.glasses].every(
    (part) => typeof part === "number" && Number.isFinite(part),
  );
}

export function encodeNounSeed(seed: NounSeed) {
  return JSON.stringify(seed);
}

export function parseNounSeed(raw: string): NounSeed | null {
  try {
    const value = JSON.parse(raw) as unknown;
    return isNounSeed(value) ? value : null;
  } catch {
    return null;
  }
}
