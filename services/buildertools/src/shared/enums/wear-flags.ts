import type { BitfieldEntry } from "./types.ts";

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
    tooltip: "Can be worn on fingers. Players have two ring slots.",
  },
  {
    bit: 2,
    label: "Neck",
    tooltip: "Can be worn around the neck. Players have two neck slots.",
  },
  {
    bit: 3,
    label: "Body",
    tooltip: "Can be worn on the body (torso armor slot).",
  },
  {
    bit: 4,
    label: "Head",
    tooltip: "Can be worn on the head (helmet/hat slot).",
  },
  {
    bit: 5,
    label: "Legs",
    tooltip: "Can be worn on the legs (leggings slot).",
  },
  {
    bit: 6,
    label: "Feet",
    tooltip: "Can be worn on the feet (boots slot).",
  },
  {
    bit: 7,
    label: "Hands",
    tooltip: "Can be worn on the hands (gloves slot).",
  },
  {
    bit: 8,
    label: "Arms",
    tooltip: "Can be worn on the arms (bracers/sleeves slot).",
  },
  {
    bit: 10,
    label: "Back",
    tooltip: "Can be worn on the back (cloak/backpack slot).",
  },
  {
    bit: 11,
    label: "Waist",
    tooltip: "Can be worn around the waist (belt slot).",
  },
  {
    bit: 12,
    label: "Wrists",
    tooltip: "Can be worn on the wrists. Players have two wrist slots.",
  },
  {
    bit: 14,
    label: "Hold",
    tooltip:
      "Can be held in hand. Used for held items like orbs, shields, or tools.",
  },
  {
    bit: 15,
    label: "Throw",
    tooltip: "Item can be thrown as a weapon. Interacts with ranged combat.",
  },
];
