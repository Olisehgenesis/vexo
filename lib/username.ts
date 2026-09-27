import { GREEK_FIGURES } from "./greek-figures";

const ADJECTIVES = [
  "rainy",
  "silent",
  "cosmic",
  "lunar",
  "golden",
  "velvet",
  "frosty",
  "wild",
  "ancient",
  "swift",
  "midnight",
  "electric",
  "quiet",
  "crimson",
  "stormy",
  "sleepy",
  "solar",
  "tidal",
  "ember",
  "ivory",
  "obsidian",
  "honey",
  "polar",
  "dusk",
  "dawn",
  "misty",
  "amber",
  "pearl",
  "smoke",
  "thunder",
  "coral",
  "violet",
  "inked",
  "maple",
  "cedar",
  "ocean",
  "desert",
  "alpine",
  "molten",
  "silver",
  "hollow",
  "neon",
  "paper",
  "orchid",
  "nile",
  "saffron",
  "copper",
  "onyx",
  "azure",
  "willow",
];

const WORLD_FIGURES = [
  "horus",
  "ra",
  "isis",
  "osiris",
  "thoth",
  "maat",
  "anubis",
  "bastet",
  "sekhmet",
  "hathor",
  "amun",
  "seshat",
  "nut",
  "set",
  "ptah",
  "odin",
  "thor",
  "freya",
  "loki",
  "frigg",
  "tyr",
  "baldur",
  "hel",
  "skadi",
  "anansi",
  "nyame",
  "shango",
  "oya",
  "ogun",
  "yemoja",
  "eshu",
  "kintu",
  "mukasa",
  "amaterasu",
  "inari",
  "tsukuyomi",
  "indra",
  "kali",
  "durga",
  "lakshmi",
  "agni",
  "varuna",
  "perun",
  "brigid",
  "lugh",
  "morrigan",
  "dagda",
];

const FIGURES = [...new Set([...GREEK_FIGURES, ...WORLD_FIGURES])];

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function usernameSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export function suggestUsername(isTaken: (username: string) => boolean) {
  for (let i = 0; i < 40; i += 1) {
    const handle = `${pick(ADJECTIVES)}_${pick(FIGURES)}`;
    if (!isTaken(handle)) return handle;
  }
  return `${pick(ADJECTIVES)}_${pick(FIGURES)}_${Math.floor(10 + Math.random() * 89)}`;
}
