import type { EnumEntry } from "./types.ts";

// File values from mapApplyToFile()/mapFileToApply() in enum.cc.
// Labels and assignability from apply_types[] in constants.cc.
// Values 15-17, 22, 25-26 are unused (map to APPLY_NONE) and omitted.
export const APPLY_TYPES: EnumEntry[] = [
  { label: "None", value: 0 },
  { label: "Strength", value: 1 },
  { label: "Intelligence", value: 2 },
  { label: "Wisdom", value: 3 },
  { label: "Dexterity", value: 4 },
  { label: "Constitution", value: 5 },
  { label: "Karma", value: 6 },
  { label: "Sex", value: 7 },
  { label: "Age", value: 8 },
  { label: "Height", value: 9 },
  { label: "Weight", value: 10 },
  { label: "Armor", value: 11 },
  { label: "Max HP", value: 12 },
  { label: "Mana", value: 13 },
  { label: "Movement", value: 14 },
  { disabledReason: "Not settable by builders", label: "Hit Roll", value: 18 },
  {
    disabledReason: "Not settable by builders",
    label: "Damage Roll",
    value: 19,
  },
  {
    disabledReason: "Not settable by builders",
    label: "Hit & Damage",
    value: 20,
  },
  { label: "Immunity", value: 21 },
  { label: "Spell", value: 23 },
  { label: "Spell Effect", value: 24 },
  { label: "Light", value: 27 },
  { label: "Noise", value: 28 },
  { label: "Can Be Seen", value: 29 },
  { label: "Vision", value: 30 },
  {
    disabledReason: "Not settable by builders",
    label: "Protection",
    value: 31,
  },
  { label: "Brawn", value: 32 },
  { label: "Agility", value: 33 },
  { label: "Focus", value: 34 },
  { label: "Speed", value: 35 },
  { label: "Perception", value: 36 },
  { label: "Charisma", value: 37 },
  { label: "Discipline", value: 38 },
  {
    disabledReason: "Not settable by builders",
    label: "Spell Hit Roll",
    value: 39,
  },
  {
    disabledReason: "Not settable by builders",
    label: "Current HP",
    value: 40,
  },
  { label: "Crit Frequency", value: 41 },
  { label: "Garble", value: 42 },
];
