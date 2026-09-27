import type { DiceStyle } from "./types";

const BACKGROUNDS = "c8d9b8,ebe4d4,d5e4cf";

export type AvatarGender = "male" | "female" | "unspecified";

export const DICE_STYLES: { id: DiceStyle; label: string }[] = [
  { id: "lorelei", label: "Lorelei" },
  { id: "adventurer", label: "Adventurer" },
  { id: "notionists", label: "Notionist" },
  { id: "dylan", label: "Dylan" },
  { id: "croodles", label: "Croodles" },
  { id: "glass", label: "Glass" },
];

const GENDERED = new Set<DiceStyle>(["adventurer", "dylan", "notionists"]);

export function stylesForGender(gender: AvatarGender): DiceStyle[] {
  if (gender === "male") return ["adventurer", "dylan", "notionists", "glass"];
  if (gender === "female") return ["lorelei", "dylan", "adventurer", "croodles"];
  return DICE_STYLES.map((s) => s.id);
}

export function dicebearUrl(
  style: DiceStyle,
  seed: string,
  size = 160,
  gender: AvatarGender = "unspecified",
) {
  const params = new URLSearchParams({
    seed,
    size: String(size),
    backgroundColor: BACKGROUNDS,
    radius: "50",
  });
  if (gender !== "unspecified" && GENDERED.has(style)) {
    params.set("gender", gender);
  }
  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}
