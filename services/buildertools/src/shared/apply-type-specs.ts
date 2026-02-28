// Specs describing how mod1/mod2 should be rendered for each apply type.
// Apply type file values from apply-types.ts (mapApplyToFile/mapFileToApply).

import type { BitfieldEntry, EnumEntry } from "./enums/types.ts";

import { INT32_MAX, INT32_MIN } from "./constants.ts";
import { AFF_FLAGS } from "./enums/aff-flags.ts";
import { DISCIPLINE_TYPES } from "./enums/discipline-types.ts";
import { GARBLE_TYPES } from "./enums/garble-types.ts";
import { IMMUNITY_TYPES } from "./enums/immunity-types.ts";
import { SPELL_TYPES } from "./enums/spell-types.ts";

export interface ApplyFieldSpec {
  bitfieldEntries?: BitfieldEntry[];
  enumEntries?: EnumEntry[];
  help?: string;
  inputType: "bitfield" | "enum" | "number";
  label: string;
  max?: number;
  min?: number;
}

export interface ApplyTypeSpec {
  mod1: ApplyFieldSpec;
  mod2?: ApplyFieldSpec; // undefined = hidden
}

function simpleNumber(label: string, help?: string): ApplyTypeSpec {
  const mod1: ApplyFieldSpec = {
    inputType: "number",
    label,
    max: INT32_MAX,
    min: INT32_MIN,
  };
  if (help !== undefined) mod1.help = help;
  return { mod1 };
}

const APPLY_TYPE_SPECS: Partial<Record<number, ApplyTypeSpec>> = {
  // Pattern 1: Simple number (mod1 = +/- bonus, mod2 hidden)
  1: simpleNumber("Strength Bonus"),
  2: simpleNumber("Intelligence Bonus"),
  3: simpleNumber("Wisdom Bonus"),
  4: simpleNumber("Dexterity Bonus"),
  5: simpleNumber("Constitution Bonus"),
  6: simpleNumber("Karma Bonus"),
  7: simpleNumber("Sex"),
  8: simpleNumber("Age Modifier"),
  9: simpleNumber("Height Modifier"),
  10: simpleNumber("Weight Modifier"),
  11: simpleNumber("Armor Bonus", "Negative values = better defense."),
  12: simpleNumber("Max HP Bonus"),
  13: simpleNumber("Mana Bonus"),
  14: simpleNumber("Movement Bonus"),
  // 18-20 are non-assignable but need specs for display
  18: simpleNumber("Hit Roll Bonus"),
  19: simpleNumber("Damage Roll Bonus"),
  20: simpleNumber("Hit & Damage Bonus"),
  // Pattern 2: Immunity (mod1 = type enum, mod2 = percentage)
  21: {
    mod1: {
      enumEntries: IMMUNITY_TYPES,
      inputType: "enum",
      label: "Immunity Type",
    },
    mod2: {
      help: "Negative = vulnerability. 100 = full immunity.",
      inputType: "number",
      label: "Immunity %",
      max: 100,
      min: -100,
    },
  },
  // Pattern 3: Spell/Skill (mod1 = spell enum, mod2 = skill bonus)
  23: {
    mod1: {
      enumEntries: SPELL_TYPES,
      inputType: "enum",
      label: "Spell/Skill",
    },
    mod2: {
      help: "Bonus to the spell/skill's learned percentage.",
      inputType: "number",
      label: "Skill Bonus",
    },
  },
  // Pattern 5: Spell Effect (mod1 = AFF_FLAGS bitfield, mod2 hidden)
  24: {
    mod1: {
      bitfieldEntries: AFF_FLAGS,
      inputType: "bitfield",
      label: "Spell Effects",
    },
  },
  27: simpleNumber("Light Bonus"),
  28: simpleNumber("Noise Modifier", "Negative values = quieter."),
  29: simpleNumber("Can Be Seen Modifier"),
  30: simpleNumber("Vision Modifier"),
  31: simpleNumber("Protection Bonus"),
  32: simpleNumber("Brawn Bonus"),
  33: simpleNumber("Agility Bonus"),
  34: simpleNumber("Focus Bonus"),
  35: simpleNumber("Speed Bonus"),
  36: simpleNumber("Perception Bonus"),
  37: simpleNumber("Charisma Bonus"),
  // Pattern 4: Discipline (mod1 = type enum, mod2 = learnedness)
  38: {
    mod1: {
      enumEntries: DISCIPLINE_TYPES,
      inputType: "enum",
      label: "Discipline",
    },
    mod2: {
      help: "0-100. How much of the discipline is learned.",
      inputType: "number",
      label: "Learnedness %",
      max: 100,
      min: 0,
    },
  },

  39: simpleNumber("Spell Hit Roll Bonus"),
  40: simpleNumber("Current HP Bonus"),

  41: simpleNumber("Crit Frequency Bonus"),
  // Pattern 6: Garble (mod1 = garble type enum, mod2 hidden)
  42: {
    mod1: {
      enumEntries: GARBLE_TYPES,
      inputType: "enum",
      label: "Garble Type",
    },
  },
};

export function getApplyTypeSpec(applyType: number): ApplyTypeSpec | undefined {
  return APPLY_TYPE_SPECS[applyType];
}
