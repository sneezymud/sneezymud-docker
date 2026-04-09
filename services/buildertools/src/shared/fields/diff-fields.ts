import type { DiffField } from "@/components/entity-diff.tsx";
import type { BitfieldEntry, EnumEntry } from "@/shared/types/enums.ts";

import { hasBit } from "@/shared/bitfield.ts";
import {
  CLASS_TYPES,
  DEFAULT_POSITION_TYPES,
  EXTRA_FLAGS,
  FACTION_TYPES,
  ITEM_TYPES,
  MATERIAL_TYPES,
  MOB_ACTIONS,
  MOB_AFFECTS,
  MOB_SPEC_PROCS,
  OBJ_SPEC_PROCS,
  RACE_TYPES,
  ROOM_FLAGS,
  ROOM_SPEC_PROCS,
  SECTOR_TYPES,
  SEX_TYPES,
  WEAR_FLAGS,
} from "@/shared/enums/index.ts";

function stringifyUnknown(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function enumFormatter(entries: EnumEntry[]): (value: unknown) => string {
  return (value) => {
    if (typeof value !== "number") return stringifyUnknown(value);
    const entry = entries.find((e) => e.value === value);
    return entry ? `${entry.label} (${value})` : String(value);
  };
}

function bitfieldFormatter(
  entries: BitfieldEntry[],
): (value: unknown) => string {
  return (value) => {
    if (typeof value !== "number") return stringifyUnknown(value);
    const active = entries.filter((e) => hasBit(value, e.bit));
    if (active.length === 0) return "(none)";
    return active.map((e) => e.label).join(", ");
  };
}

function arrayItemFormatter(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (typeof value === "object") {
    // For sub-entities (exits, extras, affects, immunities), show a compact
    // summary. JSON.stringify provides a readable fallback.
    //
    // The `in` operator narrows `value` in each branch without needing a
    // separate `Record<string, unknown>` cast. TypeScript's control-flow
    // analysis handles the property accesses after each guard.
    // Room exits: show direction and destination
    if ("direction" in value && "destination" in value) {
      return `dir ${stringifyUnknown(value.direction)} -> room ${stringifyUnknown(value.destination)}`;
    }
    // Room/obj extras: show keyword
    if ("name" in value && "description" in value && !("keyword" in value)) {
      return `"${stringifyUnknown(value.name)}"`;
    }
    // Mob extras: show keyword
    if ("keyword" in value) {
      return stringifyUnknown(value.keyword);
    }
    // Obj affects: show type and both mod values. Per objAffectSchema in
    // src/shared/schemas/obj.ts, mod2 is always present; narrow it
    // explicitly so the property access is typed.
    if ("type" in value && "mod1" in value && "mod2" in value) {
      return `type ${stringifyUnknown(value.type)}: ${stringifyUnknown(value.mod1)}/${stringifyUnknown(value.mod2)}`;
    }
    // Mob immunities: show type and amount
    if ("type" in value && "amt" in value) {
      return `type ${stringifyUnknown(value.type)}: ${stringifyUnknown(value.amt)}%`;
    }
    return JSON.stringify(value);
  }
  return stringifyUnknown(value);
}

// -- Room diff fields --

export const roomDiffFields: DiffField[] = [
  { key: "vnum", label: "Vnum" },
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { format: enumFormatter(SECTOR_TYPES), key: "sector", label: "Sector Type" },
  { key: "zone", label: "Zone" },
  { format: enumFormatter(ROOM_SPEC_PROCS), key: "spec", label: "Room Spec" },
  {
    format: bitfieldFormatter(ROOM_FLAGS),
    key: "room_flag",
    label: "Room Flags",
  },
  { key: "height", label: "Height" },
  { key: "capacity", label: "Capacity" },
  { key: "teletime", label: "Teleport Time" },
  { key: "teletarg", label: "Teleport Target" },
  { key: "telelook", label: "Teleport Look" },
  { key: "river_speed", label: "River Speed" },
  { key: "river_dir", label: "River Direction" },
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "z", label: "Z" },
  { format: arrayItemFormatter, key: "exits", label: "Exits" },
  { format: arrayItemFormatter, key: "extras", label: "Extra Descriptions" },
];

// -- Mob diff fields --

export const mobDiffFields: DiffField[] = [
  { key: "vnum", label: "Vnum" },
  { key: "name", label: "Keywords" },
  { key: "short_desc", label: "Short Description" },
  { key: "long_desc", label: "Long Description" },
  { key: "description", label: "Detailed Description" },
  { key: "local_sound", label: "Local Sound" },
  { key: "adjacent_sound", label: "Adjacent Sound" },
  { key: "level", label: "Level" },
  { key: "attacks", label: "Attacks" },
  { key: "tohit", label: "To-Hit" },
  { key: "ac", label: "AC Level" },
  { key: "hpbonus", label: "HP Bonus" },
  { key: "damage_level", label: "Damage Level" },
  { key: "damage_precision", label: "Damage Precision" },
  { format: enumFormatter(RACE_TYPES), key: "race", label: "Race" },
  { format: enumFormatter(SEX_TYPES), key: "sex", label: "Sex" },
  { format: enumFormatter(CLASS_TYPES), key: "class", label: "Class" },
  { key: "weight", label: "Weight" },
  { key: "height", label: "Height" },
  { format: enumFormatter(MATERIAL_TYPES), key: "skin", label: "Skin" },
  {
    format: enumFormatter(DEFAULT_POSITION_TYPES),
    key: "def_position",
    label: "Default Position",
  },
  {
    format: enumFormatter(MOB_SPEC_PROCS),
    key: "spec_proc",
    label: "Special Proc",
  },
  { format: enumFormatter(FACTION_TYPES), key: "faction", label: "Faction" },
  { key: "fact_perc", label: "Faction %" },
  { key: "gold", label: "Gold Constant" },
  { key: "max_exist", label: "Max Exist" },
  { key: "can_be_seen", label: "Can Be Seen" },
  { key: "vision", label: "Vision Bonus" },
  { key: "str", label: "Strength" },
  { key: "bra", label: "Brawn" },
  { key: "con", label: "Constitution" },
  { key: "dex", label: "Dexterity" },
  { key: "agi", label: "Agility" },
  { key: "spe", label: "Speed" },
  { key: "intel", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "foc", label: "Focus" },
  { key: "per", label: "Perception" },
  { key: "cha", label: "Charisma" },
  { key: "kar", label: "Karma" },
  {
    format: bitfieldFormatter(MOB_ACTIONS),
    key: "actions",
    label: "Action Flags",
  },
  {
    format: bitfieldFormatter(MOB_AFFECTS),
    key: "affects",
    label: "Affect Flags",
  },
  { format: arrayItemFormatter, key: "extras", label: "Mob Strings" },
  { format: arrayItemFormatter, key: "immunities", label: "Immunities" },
];

// -- Object diff fields --

export const objDiffFields: DiffField[] = [
  { key: "vnum", label: "Vnum" },
  { key: "name", label: "Keywords" },
  { key: "short_desc", label: "Short Description" },
  { key: "long_desc", label: "Long Description" },
  { key: "action_desc", label: "Action Description" },
  { format: enumFormatter(ITEM_TYPES), key: "type", label: "Item Type" },
  { key: "val0", label: "Value 0" },
  { key: "val1", label: "Value 1" },
  { key: "val2", label: "Value 2" },
  { key: "val3", label: "Value 3" },
  { key: "weight", label: "Weight" },
  { key: "volume", label: "Volume" },
  { key: "price", label: "Price" },
  { format: enumFormatter(MATERIAL_TYPES), key: "material", label: "Material" },
  { key: "max_struct", label: "Max Structure" },
  { key: "cur_struct", label: "Current Structure" },
  { key: "decay", label: "Decay Time" },
  { key: "max_exist", label: "Max Exist" },
  { key: "can_be_seen", label: "Can Be Seen" },
  {
    format: enumFormatter(OBJ_SPEC_PROCS),
    key: "spec_proc",
    label: "Spec Proc",
  },
  {
    format: bitfieldFormatter(EXTRA_FLAGS),
    key: "action_flag",
    label: "Extra Flags",
  },
  {
    format: bitfieldFormatter(WEAR_FLAGS),
    key: "wear_flag",
    label: "Wear Flags",
  },
  { format: arrayItemFormatter, key: "affects", label: "Applies" },
  { format: arrayItemFormatter, key: "extras", label: "Extra Descriptions" },
];
