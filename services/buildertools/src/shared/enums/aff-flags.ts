// AFF_* affect flags (bits 0-30) from defs.h.
// Used by APPLY_SPELL_EFFECT (file value 24) as a bitfield in mod1.
// Only bits 0-30 are included - the DB column (signed 32-bit int) cannot
// store bits 31+ (AFF_CLARITY through AFF_ORIENT).

import type { BitfieldEntry } from "./types.ts";

export const AFF_FLAGS: BitfieldEntry[] = [
  { bit: 0, label: "Blind" },
  { bit: 1, label: "Invisible" },
  { bit: 2, label: "Swimming" },
  { bit: 3, label: "Detect Invisible" },
  { bit: 4, label: "Detect Magic" },
  { bit: 5, label: "Sense Life" },
  { bit: 6, label: "Levitating" },
  { bit: 7, label: "Sanctuary" },
  { bit: 8, label: "Group" },
  { bit: 9, label: "Webbed" },
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
];
