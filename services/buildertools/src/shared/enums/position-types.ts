import type { EnumEntry } from "../types/enums.ts";

// Values use the legacy "file format" mapping (mapPosToFile in C++) which is
// what the DB stores. Positions 0-6 and 12 match the runtime enum, but 7-11
// are remapped: the runtime order is Engaged(7), Fighting(8), Crawling(9),
// Standing(10), Mounted(11) while the file format is Fighting(7), Crawling(8),
// Standing(9), Mounted(10), Engaged(11).
export const POSITION_TYPES: EnumEntry[] = [
  { label: "Dead", value: 0 },
  { label: "Mortally Wounded", value: 1 },
  { label: "Incapacitated", value: 2 },
  { label: "Stunned", value: 3 },
  { label: "Sleeping", value: 4 },
  { label: "Resting", value: 5 },
  { label: "Sitting", value: 6 },
  { label: "Fighting", value: 7 },
  { label: "Crawling", value: 8 },
  { label: "Standing", value: 9 },
  { label: "Mounted", value: 10 },
  { label: "Engaged", value: 11 },
  { label: "Flying", value: 12 },
];

// Only positions that make sense as a mob's default (idle) position.
export const DEFAULT_POSITION_TYPES: EnumEntry[] = POSITION_TYPES.filter(
  (p) =>
    p.value === 4 || // Sleeping
    p.value === 5 || // Resting
    p.value === 6 || // Sitting
    p.value === 8 || // Crawling
    p.value === 9 || // Standing
    p.value === 12, // Flying
);
