import type { DiceStyle } from "./types";
import { nounImageSrc, nounLooks as sdkNounLooks } from "./nouns";

export type AvatarGender = "male" | "female" | "unspecified";

export const DICE_STYLES: { id: DiceStyle; label: string }[] = [
  { id: "noun", label: "Noun" },
];

export function stylesForGender(_gender: AvatarGender): DiceStyle[] {
  return ["noun"];
}

export function nounLooks(_base?: string) {
  return sdkNounLooks(8);
}

export function dicebearUrl(
  _style: DiceStyle | string,
  seed: string,
  _size = 160,
  _gender: AvatarGender = "unspecified",
) {
  return nounImageSrc(seed);
}
