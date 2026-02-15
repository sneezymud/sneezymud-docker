import type { BitfieldEntry } from "./types.ts";

export const EXIT_FLAGS: BitfieldEntry[] = [
  { bit: 0, label: "Closed" },
  { bit: 1, label: "Locked" },
  { bit: 2, label: "Secret" },
  { bit: 3, label: "Destroyed" },
  { bit: 4, label: "No Enter" },
  { bit: 5, label: "Trapped" },
  { bit: 6, label: "Caved In" },
  { bit: 7, label: "Warded" },
  { bit: 8, label: "Sloped Up" },
  { bit: 9, label: "Sloped Down" },
  { bit: 10, label: "Jammed" },
];
