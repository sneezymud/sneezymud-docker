import type { EnumEntry } from "../types/enums.ts";

// Values are bitmasks (1 << classIndex) matching the DB column format.
// The C++ medit uses `1 << classIndex` when writing the class field.
export const CLASS_TYPES: EnumEntry[] = [
  { label: "Mage", value: 1 },
  { label: "Cleric", value: 2 },
  { label: "Warrior", value: 4 },
  { label: "Thief", value: 8 },
  { label: "Shaman", value: 16 },
  { label: "Deikhan", value: 32 },
  { label: "Monk", value: 64 },
  { label: "Ranger", value: 128 },
  { label: "Commoner", value: 256 },
];
