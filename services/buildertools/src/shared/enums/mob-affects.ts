import type { BitfieldEntry } from "./types.ts";

export const MOB_AFFECTS: BitfieldEntry[] = [
  { bit: 0, label: "Blind" },
  { bit: 1, label: "Invisible" },
  { bit: 2, label: "Swim" },
  { bit: 3, label: "Detect Invisible" },
  { bit: 4, label: "Detect Magic" },
  { bit: 5, label: "Sense Life" },
  { bit: 6, label: "Levitating" },
  { bit: 7, label: "Sanctuary" },
  { bit: 8, label: "Group" },
  { bit: 9, label: "Web" },
  { bit: 10, label: "Curse" },
  { bit: 11, label: "Flying" },
  { bit: 12, label: "Poison" },
  { bit: 13, label: "Stunned" },
  { bit: 14, label: "Paralysis" },
  { bit: 15, label: "Infravision" },
  { bit: 16, label: "Waterbreath" },
  { bit: 17, label: "Sleep" },
  { bit: 18, label: "Scrying" },
  { bit: 19, label: "Sneak" },
  { bit: 20, label: "Hide" },
  { bit: 21, label: "Shocked" },
  { bit: 22, label: "Charm" },
  { bit: 23, label: "Syphilis" },
  { bit: 24, label: "Shadow Walk" },
  { bit: 25, label: "True Sight" },
  { bit: 26, label: "Munching Corpse" },
  { bit: 27, label: "Riposte" },
  { bit: 28, label: "Silent" },
  { bit: 29, label: "Engager" },
  { bit: 30, label: "Aggressor" },
  { bit: 31, label: "Clarity" },
  // Bits 32-34 exist in the C++ server as uint64_t runtime flags, but the
  // mob.affects DB column is unsigned INT (max 2^32-1). These flags are set by
  // game commands (preen, focus_attack, orient) and never stored in the DB.
  {
    bit: 32,
    disabledReason: "Runtime-only flag (overflows DB column)",
    label: "Flightworthy",
  },
  {
    bit: 33,
    disabledReason: "Runtime-only flag (overflows DB column)",
    label: "Focus Attack",
  },
  {
    bit: 34,
    disabledReason: "Runtime-only flag (overflows DB column)",
    label: "Orient",
  },
];
