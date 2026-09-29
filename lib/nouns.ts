import { ImageData, getNounData, getRandomNounSeed } from "@nouns/assets";
import { buildSVG } from "@nouns/sdk";
import {
  encodeNounSeed,
  parseNounSeed,
  type NounSeed,
} from "@/lib/noun-seed";

export type { NounSeed };

export function randomNounSeed(): NounSeed {
  return getRandomNounSeed();
}

export function nounLooks(count = 8) {
  return Array.from({ length: count }, () => encodeNounSeed(randomNounSeed()));
}

export function nounSvg(seed: NounSeed) {
  const { parts, background } = getNounData(seed);
  return buildSVG(parts, ImageData.palette, background);
}

export function nounImageSrc(raw: string) {
  const seed = parseNounSeed(raw);
  if (seed) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(nounSvg(seed))}`;
  }
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `https://noun.pics/${(hash >>> 0) % 900}`;
}
