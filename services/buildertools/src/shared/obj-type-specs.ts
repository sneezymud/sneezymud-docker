// Type-specific value field definitions for all 77 item types (0-76).
// Replaces the label-only approach in obj-value-labels.ts with a full spec
// that supports bit-packing, enum selects, and per-field validation ranges.
//
// Source: Phase 5.2 audit (.claude/plans/buildertools/phase-5.2-type-values-audit.md)
// cross-referencing C++ getFourValues/assignFourValues overrides, ItemInfo[],
// and the GET_BITS/SET_BITS macro semantics.

import type { EnumEntry } from "./types/enums.ts";

import { FACTION_TYPES } from "./enums/faction-types.ts";
import { POSITION_TYPES } from "./enums/position-types.ts";
import { RACE_TYPES } from "./enums/race-types.ts";

// ---- Bit-packing utilities ----
// C++ uses GET_BITS(value, highBit, numBits) / SET_BITS(value, highBit, numBits, newValue).
// highBit is the topmost bit of the field; numBits is the field width.
// Example: GET_BITS(val, 7, 8) extracts bits 0-7 (the low byte).

export interface ObjValueField {
  help?: string;
  input: FieldInput;
  key: string;
  label: string;
  source: {
    highBit?: number;
    numBits?: number;
    val: 0 | 1 | 2 | 3;
  };
}

export interface ObjTypeSpec {
  fields: ObjValueField[];
}

// ---- Type spec interfaces ----

interface NumberInput {
  max?: number;
  min?: number;
  step?: number;
  type: "number";
}

interface EnumInput {
  entries: EnumEntry[];
  type: "enum";
}

interface RoomInput {
  type: "room";
}

type FieldInput = EnumInput | NumberInput | RoomInput;

/** Extract numBits bits ending at highBit from value. */
export function getBits(
  value: number,
  highBit: number,
  numBits: number,
): number {
  return (value >>> (highBit - numBits + 1)) & ((1 << numBits) - 1);
}

/** Set numBits bits ending at highBit in value to newValue, returning the updated int. */
export function setBits(
  value: number,
  highBit: number,
  numBits: number,
  newValue: number,
): number {
  const shift = highBit - numBits + 1;
  const mask = ((1 << numBits) - 1) << shift;
  return (value & ~mask) | ((newValue & ((1 << numBits) - 1)) << shift);
}

// ---- Pattern factories ----

/** TBaseCup family: maxDrinks, curDrinks, liquidType, drinkFlags. */
function baseCupFields(maxDrinks: number): ObjValueField[] {
  return [
    {
      help: `Maximum drink units (0-${maxDrinks}). 1 unit = 1 fl oz; 128 units = 1 gallon.`,
      input: { max: maxDrinks, min: 0, type: "number" },
      key: "maxDrinks",
      label: "Max Drinks",
      source: { val: 0 },
    },
    {
      help: `Drink units remaining (0-${maxDrinks}).`,
      input: { max: maxDrinks, min: 0, type: "number" },
      key: "curDrinks",
      label: "Current Drinks",
      source: { val: 1 },
    },
    {
      help: "Liquid type ID. Determines drink name, color, and effects.",
      input: { min: 0, type: "number" },
      key: "liquidType",
      label: "Liquid Type",
      source: { val: 2 },
    },
    {
      help: "Bitfield: 1=Poisoned, 2=Unlimited, 4=Spillable, 8=Frozen.",
      input: { max: 15, min: 0, type: "number" },
      key: "drinkFlags",
      label: "Drink Flags",
      source: { val: 3 },
    },
  ];
}

/** TOpenContainer family: maxWeight, packed flags/trap in val1, keyVnum, maxVolume. */
function containerFields(opts: {
  hasKey: boolean;
  volumeMax: number;
  weightMax: number;
}): ObjValueField[] {
  const fields: ObjValueField[] = [
    {
      help: `Maximum weight capacity (1-${opts.weightMax}).`,
      input: { max: opts.weightMax, min: 1, type: "number" },
      key: "maxWeight",
      label: "Weight Capacity",
      source: { val: 0 },
    },
    // val1 is bit-packed: flags[0-15], trapType[16-23], trapDam[24-31]
    {
      help: "Bitfield: 1=Closeable, 2=Pickproof, 4=Closed, 8=Locked.",
      input: { max: 65_535, min: 0, type: "number" },
      key: "containerFlags",
      label: "Container Flags",
      source: { highBit: 15, numBits: 16, val: 1 },
    },
    {
      help: "Trap type (door trap enum, file-mapped). 0 = no trap.",
      input: { max: 255, min: 0, type: "number" },
      key: "trapType",
      label: "Trap Type",
      source: { highBit: 23, numBits: 8, val: 1 },
    },
    {
      help: "Trap damage (0-255).",
      input: { max: 255, min: 0, type: "number" },
      key: "trapDam",
      label: "Trap Damage",
      source: { highBit: 31, numBits: 8, val: 1 },
    },
  ];

  if (opts.hasKey) {
    fields.push({
      help: "Vnum of the key that unlocks this container. -1 = no key.",
      input: { min: -1, type: "number" },
      key: "keyVnum",
      label: "Key Vnum",
      source: { val: 2 },
    });
  }

  fields.push({
    help: `Maximum volume capacity (1-${opts.volumeMax}).`,
    input: { max: opts.volumeMax, min: 1, type: "number" },
    key: "maxVolume",
    label: "Volume Capacity",
    source: { val: 3 },
  });

  return fields;
}

/** TMagicItem val0: level[0-7] + learnedness[8-15]. */
function magicItemVal0(): ObjValueField[] {
  return [
    {
      help: "Spell level (1-50). Determines the power of the stored spell.",
      input: { max: 50, min: 1, type: "number" },
      key: "magicLevel",
      label: "Magic Level",
      source: { highBit: 7, numBits: 8, val: 0 },
    },
    {
      help: "Learnedness (1-100). Affects spell success rate.",
      input: { max: 100, min: 1, type: "number" },
      key: "magicLearnedness",
      label: "Learnedness",
      source: { highBit: 15, numBits: 8, val: 0 },
    },
  ];
}

/** TMagicItem + TWand/TStaff: val0 packed, val1 maxCharges, val2 curCharges, val3 spell. */
function wandStaffFields(): ObjValueField[] {
  return [
    ...magicItemVal0(),
    {
      help: "Maximum charges (0-10).",
      input: { max: 10, min: 0, type: "number" },
      key: "maxCharges",
      label: "Max Charges",
      source: { val: 1 },
    },
    {
      help: "Charges remaining (0-10).",
      input: { max: 10, min: 0, type: "number" },
      key: "curCharges",
      label: "Charges Left",
      source: { val: 2 },
    },
    {
      help: "Spell file ID (-1 = none).",
      input: { min: -1, type: "number" },
      key: "spell",
      label: "Spell",
      source: { val: 3 },
    },
  ];
}

/** TBaseWeapon val0: curSharp[0-7] + maxSharp[8-15], val1: damLvl[0-7] + damDev[8-15]. */
function baseWeaponFields(): ObjValueField[] {
  return [
    {
      help: "Current sharpness (0-255). Decreases with use; affects damage.",
      input: { max: 255, min: 0, type: "number" },
      key: "curSharp",
      label: "Current Sharpness",
      source: { highBit: 7, numBits: 8, val: 0 },
    },
    {
      help: "Maximum sharpness (0-255). Sharpening restores toward this value.",
      input: { max: 255, min: 0, type: "number" },
      key: "maxSharp",
      label: "Max Sharpness",
      source: { highBit: 15, numBits: 8, val: 0 },
    },
    {
      help: "Damage level (0-255). Multiplied by 4 internally. Higher = more base damage.",
      input: { max: 255, min: 0, type: "number" },
      key: "damLvl",
      label: "Damage Level",
      source: { highBit: 7, numBits: 8, val: 1 },
    },
    {
      help: "Damage deviation (0-255). Controls damage variance.",
      input: { max: 255, min: 0, type: "number" },
      key: "damDev",
      label: "Damage Deviation",
      source: { highBit: 15, numBits: 8, val: 1 },
    },
  ];
}

/** TGun family val1: damLvl[0-7] + damDev[8-15]. */
function gunDamageFields(): ObjValueField[] {
  return [
    {
      help: "Damage level (0-255). Multiplied by 4 internally.",
      input: { max: 255, min: 0, type: "number" },
      key: "damLvl",
      label: "Damage Level",
      source: { highBit: 7, numBits: 8, val: 1 },
    },
    {
      help: "Damage deviation (0-255). Controls damage variance.",
      input: { max: 255, min: 0, type: "number" },
      key: "damDev",
      label: "Damage Deviation",
      source: { highBit: 15, numBits: 8, val: 1 },
    },
  ];
}

// ---- Full spec registry ----

const OBJ_TYPE_SPECS: Partial<Record<number, ObjTypeSpec>> = {
  // ==== No meaningful values (18 types) ====
  0: { fields: [] }, // Undefined
  // ==== Light (1) - TBaseLight ====
  1: {
    fields: [
      {
        help: "Light intensity (-2 to 20). Negative values darken the room.",
        input: { max: 20, min: -2, type: "number" },
        key: "lightAmt",
        label: "Light Amount",
        source: { val: 0 },
      },
      {
        help: "Maximum burn ticks (-1 to 10000). -1 = cannot be refueled.",
        input: { max: 10_000, min: -1, type: "number" },
        key: "maxBurn",
        label: "Max Burn",
        source: { val: 1 },
      },
      {
        help: "Fuel ticks remaining (0-10000). 0 = burnt out.",
        input: { max: 10_000, min: 0, type: "number" },
        key: "curBurn",
        label: "Current Burn",
        source: { val: 2 },
      },
      {
        help: "1 = currently lit, 0 = unlit. Should normally be set to 0.",
        input: { max: 1, min: 0, type: "number" },
        key: "isLit",
        label: "Lit",
        source: { val: 3 },
      },
    ],
  },
  // ==== Scroll (2) - TMagicItem + TScroll ====
  2: {
    fields: [
      ...magicItemVal0(),
      {
        help: "First spell file ID (-1 = none).",
        input: { min: -1, type: "number" },
        key: "spell1",
        label: "Spell 1",
        source: { val: 1 },
      },
      {
        help: "Second spell file ID (-1 = none).",
        input: { min: -1, type: "number" },
        key: "spell2",
        label: "Spell 2",
        source: { val: 2 },
      },
      {
        help: "Third spell file ID (-1 = none).",
        input: { min: -1, type: "number" },
        key: "spell3",
        label: "Spell 3",
        source: { val: 3 },
      },
    ],
  },
  // ==== Wand (3) - TMagicItem + TWand ====
  3: { fields: wandStaffFields() },
  // ==== Staff (4) - same layout as Wand ====
  4: { fields: wandStaffFields() },
  // ==== Weapon (5) - TGenWeapon (extends TBaseWeapon) ====
  5: {
    fields: [
      ...baseWeaponFields(),
      {
        help: "Primary weapon type (0-255). See HELP WEAPON TYPES.",
        input: { max: 255, min: 0, type: "number" },
        key: "weapType0",
        label: "Weapon Type 1",
        source: { highBit: 7, numBits: 8, val: 2 },
      },
      {
        help: "Frequency for weapon type 1 (0-255). Higher = more common in attack rotation.",
        input: { max: 255, min: 0, type: "number" },
        key: "weapFreq0",
        label: "Type 1 Frequency",
        source: { highBit: 15, numBits: 8, val: 2 },
      },
      {
        help: "Secondary weapon type (0-255). 0 = unused.",
        input: { max: 255, min: 0, type: "number" },
        key: "weapType1",
        label: "Weapon Type 2",
        source: { highBit: 23, numBits: 8, val: 2 },
      },
      {
        help: "Frequency for weapon type 2 (0-255).",
        input: { max: 255, min: 0, type: "number" },
        key: "weapFreq1",
        label: "Type 2 Frequency",
        source: { highBit: 31, numBits: 8, val: 2 },
      },
      {
        help: "Tertiary weapon type (0-255). 0 = unused.",
        input: { max: 255, min: 0, type: "number" },
        key: "weapType2",
        label: "Weapon Type 3",
        source: { highBit: 7, numBits: 8, val: 3 },
      },
      {
        help: "Frequency for weapon type 3 (0-255).",
        input: { max: 255, min: 0, type: "number" },
        key: "weapFreq2",
        label: "Type 3 Frequency",
        source: { highBit: 15, numBits: 8, val: 3 },
      },
    ],
  },
  // ==== Fuel (6) ====
  6: {
    fields: [
      {
        help: "Current fuel amount (0-256).",
        input: { max: 256, min: 0, type: "number" },
        key: "curFuel",
        label: "Current Fuel",
        source: { val: 0 },
      },
      {
        help: "Maximum fuel capacity (0-256).",
        input: { max: 256, min: 0, type: "number" },
        key: "maxFuel",
        label: "Max Fuel",
        source: { val: 1 },
      },
    ],
  },
  // ==== Opal (7) ====
  7: {
    fields: [
      {
        help: "Size in carats (1-50). >10 unusual, >20 very rare.",
        input: { max: 50, min: 1, type: "number" },
        key: "carats",
        label: "Carats",
        source: { val: 0 },
      },
      {
        help: "Powerstone strength (0-50). Must be <= carat weight. 0 = not a powerstone.",
        input: { max: 50, min: 0, type: "number" },
        key: "strength",
        label: "Strength",
        source: { val: 1 },
      },
      {
        help: "Current mana stored (0-500). Must be <= 10 * strength.",
        input: { max: 500, min: 0, type: "number" },
        key: "curMana",
        label: "Current Mana",
        source: { val: 2 },
      },
      {
        help: "Consecutive growth failures (0-2). At 2, the opal cannot grow stronger.",
        input: { max: 2, min: 0, type: "number" },
        key: "consecFails",
        label: "Failures",
        source: { val: 3 },
      },
    ],
  },
  // ==== Treasure (8) - ItemInfo says unused but C++ stores serial number ====
  8: {
    fields: [
      {
        help: "Serial number for tracking. Gameplay effect varies by specific treasure.",
        input: { type: "number" },
        key: "serialNumber",
        label: "Serial Number",
        source: { val: 0 },
      },
    ],
  },
  // ==== Armor (9) ====
  9: {
    fields: [
      {
        help: "AC adjustment applied when worn. Typically auto-calculated - do not set manually.",
        input: { type: "number" },
        key: "acApply",
        label: "AC Apply",
        source: { val: 0 },
      },
    ],
  },
  // ==== Potion (10) - TBaseCup ====
  10: { fields: baseCupFields(2560) },
  11: { fields: [] }, // Worn
  12: { fields: [] }, // Other
  13: { fields: [] }, // Trash
  // ==== Trap (14) ====
  14: {
    fields: [
      {
        help: "Trap level (0-50). Determines difficulty to disarm and damage scaling.",
        input: { max: 50, min: 0, type: "number" },
        key: "trapLevel",
        label: "Level",
        source: { val: 0 },
      },
      {
        help: "Trigger type bitfield. Determines what activates the trap.",
        input: { min: 0, type: "number" },
        key: "triggerFlags",
        label: "Trigger Flags",
        source: { val: 1 },
      },
      {
        help: "Trap damage type (file-mapped door trap enum).",
        input: { min: 0, type: "number" },
        key: "trapDamType",
        label: "Damage Type",
        source: { val: 2 },
      },
      {
        help: "Number of times the trap can fire (0-50).",
        input: { max: 50, min: 0, type: "number" },
        key: "trapCharges",
        label: "Charges",
        source: { val: 3 },
      },
    ],
  },
  // ==== Container/Chest (15) ====
  15: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 30_000,
      weightMax: 300,
    }),
  },
  // ==== Note (16) - ItemInfo says unused but C++ stores values ====
  16: {
    fields: [
      {
        help: "Repairman NPC vnum associated with this note.",
        input: { type: "number" },
        key: "repairmanVnum",
        label: "Repairman Vnum",
        source: { val: 0 },
      },
      {
        help: "Time adjustment value.",
        input: { type: "number" },
        key: "timeAdj",
        label: "Time Adj",
        source: { val: 1 },
      },
      {
        help: "Object value reference.",
        input: { type: "number" },
        key: "objV",
        label: "Object Value",
        source: { val: 2 },
      },
    ],
  },
  // ==== Drink Container (17) - TBaseCup ====
  17: { fields: baseCupFields(2560) },

  18: { fields: [] }, // Key

  // ==== Food (19) ====
  19: {
    fields: [
      {
        help: "Hours of hunger filled when eaten (0-24).",
        input: { max: 24, min: 0, type: "number" },
        key: "fillHours",
        label: "Fill Hours",
        source: { val: 0 },
      },
      {
        help: "Food flags: 1=Poisoned, 2=Spoiled (combinable). Fished/Butchered are runtime only.",
        input: { max: 3, min: 0, type: "number" },
        key: "foodFlags",
        label: "Food Flags",
        source: { val: 3 },
      },
    ],
  },

  // ==== Money (20) ====
  20: {
    fields: [
      {
        help: "Number of talens in this money pile (0-50000).",
        input: { max: 50_000, min: 0, type: "number" },
        key: "talens",
        label: "Talens",
        source: { val: 0 },
      },
      {
        help: "Currency type ID.",
        input: { min: 0, type: "number" },
        key: "currencyType",
        label: "Currency Type",
        source: { val: 1 },
      },
    ],
  },

  21: { fields: [] }, // Pen

  22: { fields: [] }, // Boat

  // ==== Audio (23) ====
  23: {
    fields: [
      {
        help: "Frequency of the noise produced (0-500).",
        input: { max: 500, min: 0, type: "number" },
        key: "frequency",
        label: "Frequency",
        source: { val: 0 },
      },
    ],
  },

  // ==== Board (24) ====
  24: {
    fields: [
      {
        help: "Minimum character level required to view this board (0-60).",
        input: { max: 60, min: 0, type: "number" },
        key: "minLevel",
        label: "Min Level to View",
        source: { val: 0 },
      },
    ],
  },

  // ==== Bow (25) ====
  25: {
    fields: [
      {
        help: "Internal bow flags (0-1).",
        input: { max: 1, min: 0, type: "number" },
        key: "bowFlags",
        label: "Bow Flags",
        source: { val: 1 },
      },
      {
        help: "Arrow type this bow fires (0-7). See HELP ARROWS.",
        input: { max: 7, min: 0, type: "number" },
        key: "arrowType",
        label: "Arrow Type",
        source: { val: 2 },
      },
      {
        help: "Maximum range in rooms (0-10).",
        input: { max: 10, min: 0, type: "number" },
        key: "maxRange",
        label: "Range",
        source: { val: 3 },
      },
    ],
  },

  // ==== Arrow (26) - TArrow extends TBaseWeapon ====
  26: {
    fields: [
      ...baseWeaponFields(),
      // val2: trapLevel[0-15] + trapDamType[16-31]
      {
        help: "Arrow trap level (0-65535). 0 = no trap.",
        input: { max: 65_535, min: 0, type: "number" },
        key: "arrowTrapLevel",
        label: "Trap Level",
        source: { highBit: 15, numBits: 16, val: 2 },
      },
      {
        help: "Trap damage type (door trap enum, file-mapped).",
        input: { max: 65_535, min: 0, type: "number" },
        key: "arrowTrapDamType",
        label: "Trap Damage Type",
        source: { highBit: 31, numBits: 16, val: 2 },
      },
      // val3: arrowType[0-3] + arrowHead[4-7] + headMat[8-16] + arrowFlags[17-31]
      {
        help: "Arrow type (0-15).",
        input: { max: 15, min: 0, type: "number" },
        key: "arrowType",
        label: "Arrow Type",
        source: { highBit: 3, numBits: 4, val: 3 },
      },
      {
        help: "Arrow head type (0-15).",
        input: { max: 15, min: 0, type: "number" },
        key: "arrowHead",
        label: "Arrow Head",
        source: { highBit: 7, numBits: 4, val: 3 },
      },
      {
        help: "Arrow head material (0-511).",
        input: { max: 511, min: 0, type: "number" },
        key: "arrowHeadMat",
        label: "Head Material",
        source: { highBit: 16, numBits: 9, val: 3 },
      },
      {
        help: "Arrow flags bitfield (0-32767).",
        input: { max: 32_767, min: 0, type: "number" },
        key: "arrowFlags",
        label: "Arrow Flags",
        source: { highBit: 31, numBits: 15, val: 3 },
      },
    ],
  },

  // ==== Bag (27) ====
  27: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 10_000_000,
      weightMax: 50_000,
    }),
  },

  // ==== Corpse (28) - TBaseCorpse (simple) ====
  28: {
    fields: [
      {
        help: "Corpse flags bitfield.",
        input: { min: 0, type: "number" },
        key: "corpseFlags",
        label: "Corpse Flags",
        source: { val: 0 },
      },
      {
        help: "Race of the former creature.",
        input: { entries: RACE_TYPES, type: "enum" },
        key: "corpseRace",
        label: "Former Race",
        source: { val: 1 },
      },
      {
        help: "Level of the former creature.",
        input: { min: 0, type: "number" },
        key: "corpseLevel",
        label: "Former Level",
        source: { val: 2 },
      },
      {
        help: "Vnum of the former creature.",
        input: { min: 0, type: "number" },
        key: "corpseVnum",
        label: "Former Vnum",
        source: { val: 3 },
      },
    ],
  },

  // ==== Spell Bag (29) ====
  29: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 100_000,
      weightMax: 500,
    }),
  },

  // ==== Component (30) - val1 is ignored by C++ (skip it) ====
  30: {
    fields: [
      {
        help: "Number of uses remaining (0-10).",
        input: { max: 10, min: 0, type: "number" },
        key: "charges",
        label: "Charges",
        source: { val: 0 },
      },
      {
        help: "Spell file ID this component is used for.",
        input: { min: 0, type: "number" },
        key: "spellNum",
        label: "Spell",
        source: { val: 2 },
      },
      {
        help: "Decay/usage flags (0-15). Controls component consumption behavior.",
        input: { max: 15, min: 0, type: "number" },
        key: "componentType",
        label: "Usage Flags",
        source: { val: 3 },
      },
    ],
  },

  31: { fields: [] }, // Book

  // ==== Portal (32) - densely packed across all 4 vals ====
  32: {
    fields: [
      // val0: destination[0-23] + charges[24-31]
      {
        help: "Destination room vnum (0-16777215).",
        input: { max: 16_777_215, min: 0, type: "number" },
        key: "destination",
        label: "Destination",
        source: { highBit: 23, numBits: 24, val: 0 },
      },
      {
        help: "Uses before the portal disappears (0-255). 0 = unlimited.",
        input: { max: 255, min: 0, type: "number" },
        key: "numCharges",
        label: "Charges",
        source: { highBit: 31, numBits: 8, val: 0 },
      },
      // val1: portalType[0-7]
      {
        help: "Portal type (0-12). See HELP PORTAL INFO.",
        input: { max: 12, min: 0, type: "number" },
        key: "portalType",
        label: "Portal Type",
        source: { highBit: 7, numBits: 8, val: 1 },
      },
      // val2: trapType[0-7] + trapDam[8-23]
      {
        help: "Trap type on the portal (0-255). 0 = no trap.",
        input: { max: 255, min: 0, type: "number" },
        key: "portalTrapType",
        label: "Trap Type",
        source: { highBit: 7, numBits: 8, val: 2 },
      },
      {
        help: "Trap damage (0-65535).",
        input: { max: 65_535, min: 0, type: "number" },
        key: "portalTrapDam",
        label: "Trap Damage",
        source: { highBit: 23, numBits: 16, val: 2 },
      },
      // val3: portalKey[0-23] + portalFlags[24-31]
      {
        help: "Key vnum required to use the portal (0-16777215). 0 = no key.",
        input: { max: 16_777_215, min: 0, type: "number" },
        key: "portalKey",
        label: "Portal Key",
        source: { highBit: 23, numBits: 24, val: 3 },
      },
      {
        help: "Portal state flags (0-255). Controls open/closed/locked state.",
        input: { max: 255, min: 0, type: "number" },
        key: "portalFlags",
        label: "Portal Flags",
        source: { highBit: 31, numBits: 8, val: 3 },
      },
    ],
  },

  // ==== Window (33) - val0 is target room (whole int; negative = opposite direction) ====
  33: {
    fields: [
      {
        help: "Room vnum this window looks into. Negative = opposite direction encoding.",
        input: { type: "number" },
        key: "targetRoom",
        label: "Target Room",
        source: { val: 0 },
      },
    ],
  },

  34: { fields: [] }, // Tree

  // ==== Tool (35) ====
  35: {
    fields: [
      {
        help: "Tool type ID. Determines what crafting actions this tool enables.",
        input: { min: 0, type: "number" },
        key: "toolType",
        label: "Tool Type",
        source: { val: 0 },
      },
      {
        help: "Uses remaining before the tool breaks (0-100).",
        input: { max: 100, min: 0, type: "number" },
        key: "usesLeft",
        label: "Uses Left",
        source: { val: 1 },
      },
      {
        help: "Maximum uses (0-100). Tool can be repaired up to this value.",
        input: { max: 100, min: 0, type: "number" },
        key: "maxUses",
        label: "Max Uses",
        source: { val: 2 },
      },
    ],
  },

  // ==== Holy Symbol (36) ====
  36: {
    fields: [
      {
        help: "Current divine strength (0-1800000).",
        input: { max: 1_800_000, min: 0, type: "number" },
        key: "curStrength",
        label: "Current Strength",
        source: { val: 0 },
      },
      {
        help: "Maximum divine strength (0-1800000).",
        input: { max: 1_800_000, min: 0, type: "number" },
        key: "maxStrength",
        label: "Max Strength",
        source: { val: 1 },
      },
      {
        help: "Which deity faction this symbol belongs to.",
        input: { entries: FACTION_TYPES, type: "enum" },
        key: "faction",
        label: "Faction",
        source: { val: 2 },
      },
    ],
  },

  // ==== Quiver (37) ====
  37: {
    fields: containerFields({
      hasKey: false,
      volumeMax: 100_000,
      weightMax: 500,
    }),
  },

  38: { fields: [] }, // Bandage

  39: { fields: [] }, // Statue

  // ==== Bed (40) - val0 packed ====
  40: {
    fields: [
      // val0: maxUsers[0-3] + minPosUse[4-7]
      {
        help: "Maximum simultaneous users (0-15).",
        input: { max: 15, min: 0, type: "number" },
        key: "maxUsers",
        label: "Max Users",
        source: { highBit: 3, numBits: 4, val: 0 },
      },
      {
        help: "Minimum position required to use this bed or chair.",
        input: { entries: POSITION_TYPES, type: "enum" },
        key: "minPosUse",
        label: "Min Position",
        source: { highBit: 7, numBits: 4, val: 0 },
      },
      {
        help: "Maximum user height in inches (2-100). Taller characters cannot use this.",
        input: { max: 100, min: 2, type: "number" },
        key: "maxSize",
        label: "Max Size",
        source: { val: 1 },
      },
      {
        help: "Seat height above ground in inches (1-100).",
        input: { max: 100, min: 1, type: "number" },
        key: "seatHeight",
        label: "Seat Height",
        source: { val: 2 },
      },
      {
        help: "Extra regeneration bonus (-1 to 40). -1 = no bonus.",
        input: { max: 40, min: -1, type: "number" },
        key: "regen",
        label: "Regen Bonus",
        source: { val: 3 },
      },
    ],
  },

  41: { fields: [] }, // Table

  42: { fields: [] }, // Raw Material

  43: { fields: [] }, // Gemstone

  // ==== Martial Weapon (44) - disabled for builders but define for display ====
  44: { fields: baseWeaponFields() },

  45: { fields: [] }, // Jewelry

  // ==== Vial (46) - TBaseCup ====
  46: { fields: baseCupFields(3000) },

  // ==== Pool (48) - non-standard TBaseCup layout (val0 unused, val1 has drinks) ====
  48: {
    fields: [
      {
        help: "Drink units available (0-2560).",
        input: { max: 2560, min: 0, type: "number" },
        key: "drinkUnits",
        label: "Drink Units",
        source: { val: 1 },
      },
      {
        help: "Liquid type ID.",
        input: { min: 0, type: "number" },
        key: "liquidType",
        label: "Liquid Type",
        source: { val: 2 },
      },
      {
        help: "Decay flag. 0 = pool decays normally, non-zero = permanent.",
        input: { max: 1, min: 0, type: "number" },
        key: "decayFlag",
        label: "Permanent",
        source: { val: 3 },
      },
    ],
  },

  // ==== Keyring (49) ====
  49: {
    fields: containerFields({
      hasKey: false,
      volumeMax: 100_000,
      weightMax: 500,
    }),
  },

  // ==== Raw Organic (50) ====
  50: {
    fields: [
      {
        help: "Classification type (1-10). See HELP RAW ORGANIC.",
        input: { max: 10, min: 1, type: "number" },
        key: "classification",
        label: "Classification",
        source: { val: 0 },
      },
      {
        help: "Total units available (-1 to 500). -1 = non-unit based.",
        input: { max: 500, min: -1, type: "number" },
        key: "units",
        label: "Units",
        source: { val: 1 },
      },
      {
        help: "Material level (1-127).",
        input: { max: 127, min: 1, type: "number" },
        key: "level",
        label: "Level",
        source: { val: 2 },
      },
      {
        help: "Added effect type (-1 to 10). See HELP RAW ORGANIC. -1 = none.",
        input: { max: 10, min: -1, type: "number" },
        key: "addedEffect",
        label: "Added Effect",
        source: { val: 3 },
      },
    ],
  },

  // ==== Flame (51) - TFFlame ====
  51: {
    fields: [
      {
        help: "Light intensity (-100 to 100). Negative values darken the area.",
        input: { max: 100, min: -100, type: "number" },
        key: "lightValue",
        label: "Light Value",
        source: { val: 0 },
      },
      {
        help: "Heat intensity (1-99). Affects fire damage and cooking.",
        input: { max: 99, min: 1, type: "number" },
        key: "heatValue",
        label: "Heat Value",
        source: { val: 1 },
      },
    ],
  },

  // ==== Applied Substance (52) ====
  52: {
    fields: [
      {
        help: "Apply flags (0-1). Controls application behavior.",
        input: { max: 1, min: 0, type: "number" },
        key: "applyFlags",
        label: "Apply Flags",
        source: { val: 0 },
      },
      {
        help: "Application method (1-10). See HELP APPLY METHODS.",
        input: { max: 10, min: 1, type: "number" },
        key: "applyMethod",
        label: "Apply Method",
        source: { val: 1 },
      },
      {
        help: "Effective level of the substance (1-50).",
        input: { max: 50, min: 1, type: "number" },
        key: "level",
        label: "Level",
        source: { val: 2 },
      },
      {
        help: "Spell or skill file ID applied by this substance.",
        input: { min: 0, type: "number" },
        key: "spellSkill",
        label: "Spell/Skill",
        source: { val: 3 },
      },
    ],
  },

  // ==== Gas (53) - ItemInfo says unused but C++ stores gasType in val0 ====
  53: {
    fields: [
      {
        help: "Gas type ID. Determines behavior and effects.",
        input: { min: 0, type: "number" },
        key: "gasType",
        label: "Gas Type",
        source: { val: 0 },
      },
    ],
  },

  // ==== Armor Wand (54) - same layout as Wand ====
  54: { fields: wandStaffFields() },

  // ==== Drug Container (55) ====
  55: {
    fields: [
      {
        help: "Drug type (file-mapped).",
        input: { min: 0, type: "number" },
        key: "drugType",
        label: "Drug Type",
        source: { val: 0 },
      },
      {
        help: "Maximum burn ticks (-1 to 10000). -1 = cannot be refueled.",
        input: { max: 10_000, min: -1, type: "number" },
        key: "maxBurn",
        label: "Max Burn",
        source: { val: 1 },
      },
      {
        help: "Burn ticks remaining (0-10000).",
        input: { max: 10_000, min: 0, type: "number" },
        key: "curBurn",
        label: "Current Burn",
        source: { val: 2 },
      },
      {
        help: "1 = currently lit, 0 = unlit. Should normally be 0.",
        input: { max: 1, min: 0, type: "number" },
        key: "isLit",
        label: "Lit",
        source: { val: 3 },
      },
    ],
  },

  // ==== Drug (56) ====
  56: {
    fields: [
      {
        help: "Current drug amount (0-75).",
        input: { max: 75, min: 0, type: "number" },
        key: "curFuel",
        label: "Current Amount",
        source: { val: 0 },
      },
      {
        help: "Maximum drug amount (0-75).",
        input: { max: 75, min: 0, type: "number" },
        key: "maxFuel",
        label: "Max Amount",
        source: { val: 1 },
      },
      {
        help: "Drug type (file-mapped).",
        input: { min: 0, type: "number" },
        key: "drugType",
        label: "Drug Type",
        source: { val: 2 },
      },
    ],
  },

  // ==== Gun (57) - TGun (overrides TBaseWeapon entirely) ====
  57: {
    fields: [
      {
        help: "Rate of fire (0-10). Shots per round.",
        input: { max: 10, min: 0, type: "number" },
        key: "rof",
        label: "Rate of Fire",
        source: { val: 0 },
      },
      ...gunDamageFields(),
      {
        help: "Gun behavior bit flags.",
        input: { min: 0, type: "number" },
        key: "gunFlags",
        label: "Gun Flags",
        source: { val: 2 },
      },
      {
        help: "Ammo type enum. Determines which ammunition this gun uses.",
        input: { min: 0, type: "number" },
        key: "ammoType",
        label: "Ammo Type",
        source: { val: 3 },
      },
    ],
  },

  // ==== Ammo (58) ====
  58: {
    fields: [
      {
        help: "Ammo type enum. Must match the gun's ammo type.",
        input: { min: 0, type: "number" },
        key: "ammoType",
        label: "Ammo Type",
        source: { val: 0 },
      },
      {
        help: "Number of rounds (0-500).",
        input: { max: 500, min: 0, type: "number" },
        key: "rounds",
        label: "Rounds",
        source: { val: 1 },
      },
    ],
  },

  // ==== Plant (59) ====
  59: {
    fields: [
      {
        help: "Plant species type.",
        input: { min: 0, type: "number" },
        key: "plantType",
        label: "Type",
        source: { val: 0 },
      },
      {
        help: "Current growth age.",
        input: { min: 0, type: "number" },
        key: "age",
        label: "Age",
        source: { val: 1 },
      },
      {
        help: "Harvest yield amount.",
        input: { min: 0, type: "number" },
        key: "yield",
        label: "Yield",
        source: { val: 2 },
      },
      {
        help: "Whether the plant is verminated (pest-infested).",
        input: { min: 0, type: "number" },
        key: "verminated",
        label: "Verminated",
        source: { val: 3 },
      },
    ],
  },

  // ==== Cookware (60) ====
  60: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 30_000,
      weightMax: 300,
    }),
  },

  // ==== Vehicle (61) - val3 packed ====
  61: {
    fields: [
      {
        help: "Vnum of the room inside the vehicle.",
        input: { type: "room" },
        key: "insideRoom",
        label: "Inside Room",
        source: { val: 0 },
      },
      {
        help: "Vehicle type (0-1). 0 = standard, 1 = naval.",
        input: { max: 1, min: 0, type: "number" },
        key: "vehicleType",
        label: "Vehicle Type",
        source: { val: 1 },
      },
      {
        help: "0 = single room vehicle, 1 = whole zone vehicle.",
        input: { max: 1, min: 0, type: "number" },
        key: "wholeZone",
        label: "Whole Zone",
        source: { val: 2 },
      },
      // val3: portalKey[0-23] + portalFlags[24-31]
      {
        help: "Key vnum required to enter (0-16777215). 0 = no key.",
        input: { max: 16_777_215, min: 0, type: "number" },
        key: "vehicleKey",
        label: "Key Vnum",
        source: { highBit: 23, numBits: 24, val: 3 },
      },
      {
        help: "Portal state flags (0-255). Controls open/closed/locked state.",
        input: { max: 255, min: 0, type: "number" },
        key: "vehicleFlags",
        label: "Flags",
        source: { highBit: 31, numBits: 8, val: 3 },
      },
    ],
  },

  62: { fields: [] }, // Casino Chip

  // ==== Poison (63) - TBaseCup ====
  63: { fields: baseCupFields(2560) },

  // ==== Handgonne (64) - TGun ====
  64: {
    fields: [
      {
        help: "Rate of fire (fixed at 1 for handgonnes).",
        input: { max: 1, min: 1, type: "number" },
        key: "rof",
        label: "Rate of Fire",
        source: { val: 0 },
      },
      ...gunDamageFields(),
      {
        help: "Gun behavior bit flags.",
        input: { min: 0, type: "number" },
        key: "gunFlags",
        label: "Gun Flags",
        source: { val: 2 },
      },
      {
        help: "Ammo type (fixed: lead shot for handgonnes).",
        input: { type: "number" },
        key: "ammoType",
        label: "Ammo Type",
        source: { val: 3 },
      },
    ],
  },

  // ==== Egg (65) - TFood + bit 31 flag ====
  65: {
    fields: [
      // val0: fillHours in bits 0-30, eggTouched in bit 31
      {
        help: "Hours of hunger filled if eaten (0-24).",
        input: { max: 24, min: 0, type: "number" },
        key: "fillHours",
        label: "Fill Hours",
        source: { highBit: 30, numBits: 31, val: 0 },
      },
      {
        help: "Whether the egg has been touched/moved (0-1). Affects hatching.",
        input: { max: 1, min: 0, type: "number" },
        key: "eggTouched",
        label: "Touched",
        source: { highBit: 31, numBits: 1, val: 0 },
      },
      {
        help: "Incubation timer (0-500). Ticks until hatching.",
        input: { max: 500, min: 0, type: "number" },
        key: "eggTimer",
        label: "Incubation Timer",
        source: { val: 1 },
      },
      {
        help: "Vnum of the mob that hatches from this egg.",
        input: { min: 0, type: "number" },
        key: "hatchMobVnum",
        label: "Hatch Mob Vnum",
        source: { val: 2 },
      },
      {
        help: "Food flags: 1=Poisoned, 2=Spoiled (combinable).",
        input: { max: 3, min: 0, type: "number" },
        key: "foodFlags",
        label: "Food Flags",
        source: { val: 3 },
      },
    ],
  },

  // ==== Cannon (66) - TGun ====
  66: {
    fields: [
      {
        help: "Rate of fire (fixed at 1 for cannons).",
        input: { max: 1, min: 1, type: "number" },
        key: "rof",
        label: "Rate of Fire",
        source: { val: 0 },
      },
      ...gunDamageFields(),
      {
        help: "Gun behavior bit flags.",
        input: { min: 0, type: "number" },
        key: "gunFlags",
        label: "Gun Flags",
        source: { val: 2 },
      },
      {
        help: "Ammo type (fixed: cannonball for cannons).",
        input: { type: "number" },
        key: "ammoType",
        label: "Ammo Type",
        source: { val: 3 },
      },
    ],
  },

  // ==== Container family (TOpenContainer subtypes) ====
  67: {
    fields: containerFields({
      hasKey: false,
      volumeMax: 100_000,
      weightMax: 500,
    }),
  }, // Tooth Necklace

  68: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 10_000_000,
      weightMax: 50_000,
    }),
  }, // Trash Pile

  69: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 10_000_000,
      weightMax: 50_000,
    }),
  }, // Card Deck
  70: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 10_000_000,
      weightMax: 50_000,
    }),
  }, // Suitcase
  71: { fields: [] }, // Saddle
  72: { fields: [] }, // Harness
  73: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 10_000_000,
      weightMax: 50_000,
    }),
  }, // Saddlebag
  74: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 500_000,
      weightMax: 5000,
    }),
  }, // Wagon
  75: {
    fields: containerFields({
      hasKey: true,
      volumeMax: 10_000_000,
      weightMax: 50_000,
    }),
  }, // Money Pouch

  // ==== Fruit (76) - TFruit extends TFood ====
  76: {
    fields: [
      {
        help: "Hours of hunger filled when eaten (0-24).",
        input: { max: 24, min: 0, type: "number" },
        key: "fillHours",
        label: "Fill Hours",
        source: { val: 0 },
      },
      {
        help: "Vnum of the seed item produced when fruit is eaten.",
        input: { min: 0, type: "number" },
        key: "seedVnum",
        label: "Seed Vnum",
        source: { val: 1 },
      },
      {
        help: "Food flags: 1=Poisoned, 2=Spoiled (combinable).",
        input: { max: 3, min: 0, type: "number" },
        key: "foodFlags",
        label: "Food Flags",
        source: { val: 3 },
      },
    ],
  },
};

// ---- Public API ----

/** Highest defined item type number. Used by tests to iterate all types. */
export const MAX_ITEM_TYPE = 76;

/** Get the type spec for an item type. Returns undefined for unknown types (>76). */
export function getObjTypeSpec(itemType: number): ObjTypeSpec | undefined {
  return OBJ_TYPE_SPECS[itemType];
}

/** Extract typed field values from raw val0-val3 using a type spec. */
export function expandTypeValues(
  spec: ObjTypeSpec,
  rawVals: [number, number, number, number],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const field of spec.fields) {
    const raw = rawVals[field.source.val];
    result[field.key] =
      field.source.highBit !== undefined && field.source.numBits !== undefined
        ? getBits(raw, field.source.highBit, field.source.numBits)
        : raw;
  }
  return result;
}
