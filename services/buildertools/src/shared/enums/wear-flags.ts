import type { BitfieldEntry } from "../types/enums.ts";

export const WEAR_FLAGS: BitfieldEntry[] = [
  {
    bit: 0,
    label: "Take",
    tooltip:
      "Item can be picked up by players. Without this, the item is scenery only.",
  },
  {
    bit: 1,
    label: "Fingers",
    tooltip: "Players have only two ring slots.",
  },
  {
    bit: 2,
    label: "Neck",
  },
  {
    bit: 3,
    label: "Body",
  },
  {
    bit: 4,
    label: "Head",
  },
  {
    bit: 5,
    label: "Legs",
    tooltip:
      "Leg equipment with the 'Paired' extra flag occupies both leg slots with a single object. Otherwise the equipment will only occupy a single leg slot.",
  },
  {
    bit: 6,
    label: "Feet",
  },
  {
    bit: 7,
    label: "Hands",
  },
  {
    bit: 8,
    label: "Arms",
  },
  {
    bit: 10,
    label: "Back",
  },
  {
    bit: 11,
    label: "Waist",
  },
  {
    bit: 12,
    label: "Wrists",
  },
  {
    bit: 14,
    label: "Hold",
    tooltip:
      "Can be held in hand. Necessary for held items like orbs, shields, or tools.",
  },
  {
    bit: 15,
    label: "Throw",
    tooltip: "Item can be thrown as a weapon. Interacts with ranged combat.",
  },
];
