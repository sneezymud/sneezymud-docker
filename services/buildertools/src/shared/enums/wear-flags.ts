import type { BitfieldEntry } from "./types.ts";

export const WEAR_FLAGS: BitfieldEntry[] = [
  { bit: 0, label: "Take" },
  { bit: 1, label: "Fingers" },
  { bit: 2, label: "Neck" },
  { bit: 3, label: "Body" },
  { bit: 4, label: "Head" },
  { bit: 5, label: "Legs" },
  { bit: 6, label: "Feet" },
  { bit: 7, label: "Hands" },
  { bit: 8, label: "Arms" },
  { bit: 10, label: "Back" },
  { bit: 11, label: "Waist" },
  { bit: 12, label: "Wrists" },
  { bit: 14, label: "Hold" },
  { bit: 15, label: "Throw" },
];
