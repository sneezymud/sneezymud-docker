import type { BitfieldEntry } from "../types/enums.ts";

export const EXTRA_FLAGS: BitfieldEntry[] = [
  {
    bit: 0,
    label: "Glow",
    tooltip:
      "Emits light. Bypasses canBeSeen visibility checks. Visible in darkness.",
  },
  {
    bit: 1,
    label: "Hum",
    tooltip: "Emits a humming sound, periodically notifying nearby players.",
  },
  {
    bit: 2,
    disabledReason: "Set automatically when item strings are customized",
    label: "Strung",
  },
  {
    bit: 3,
    label: "Shadowy",
    tooltip:
      "Item flickers with shadow. Interacts with shadow walk and stealth mechanics.",
  },
  {
    bit: 4,
    disabledReason: "Requires POWER_OEDIT_NOPROTOS (high immortal only)",
    label: "Prototype",
  },
  {
    bit: 5,
    label: "Invisible",
    tooltip:
      "Item cannot be seen without Detect Invisible spell. Overrides canBeSeen.",
  },
  {
    bit: 6,
    label: "Magic",
    tooltip:
      "Detectable with Detect Magic spell. Affects dispel interactions and salvage.",
  },
  {
    bit: 7,
    label: "Nodrop",
    tooltip:
      "Cursed - cannot be dropped or given away. Requires Remove Curse to unequip.",
  },
  {
    bit: 8,
    label: "Bless",
    tooltip:
      "Blessed by divine magic. Provides minor combat bonuses and affects undead interactions.",
  },
  {
    bit: 9,
    label: "Spiked",
    tooltip: "Item has spikes. Deals damage to attackers when worn as armor.",
  },
  {
    bit: 10,
    label: "Hover",
    tooltip: "Item hovers in the air instead of lying on the ground.",
  },
  {
    bit: 11,
    label: "Rusty",
    tooltip:
      "Item is rusted, reducing its effectiveness. Can be cleaned with appropriate tools.",
  },
  { bit: 12, label: "Anti-Cleric", tooltip: "Cannot be used by Clerics." },
  { bit: 13, label: "Anti-Mage", tooltip: "Cannot be used by Mages." },
  { bit: 14, label: "Anti-Thief", tooltip: "Cannot be used by Thieves." },
  { bit: 15, label: "Anti-Warrior", tooltip: "Cannot be used by Warriors." },
  { bit: 16, label: "Anti-Shaman", tooltip: "Cannot be used by Shamans." },
  { bit: 17, label: "Anti-Deikhan", tooltip: "Cannot be used by Deikhans." },
  { bit: 18, label: "Anti-Ranger", tooltip: "Cannot be used by Rangers." },
  { bit: 19, label: "Anti-Monk", tooltip: "Cannot be used by Monks." },
  {
    bit: 20,
    label: "Paired",
    tooltip: "Must be equipped in pairs. Requires two identical items.",
  },
  {
    bit: 21,
    label: "Norent",
    tooltip:
      "Item does not save when player logs out. Disappears on disconnect.",
  },
  {
    bit: 22,
    label: "Float",
    tooltip: "Item floats on water. Won't be lost when dropped in water rooms.",
  },
  {
    bit: 23,
    label: "Nopurge",
    tooltip:
      "Item cannot be purged by immortal commands. Useful for permanent fixtures.",
  },
  {
    bit: 24,
    label: "Newbie",
    tooltip: "Item restricted to or designed for new characters.",
  },
  {
    bit: 25,
    label: "Nojunk Player",
    tooltip: "Players cannot junk this item. Currently unused in practice.",
  },
  {
    bit: 26,
    label: "Silvered",
    tooltip:
      "Weapon is silvered. Extra damage against lycanthropes and certain undead.",
  },
  {
    bit: 28,
    label: "Attached",
    tooltip: "Item is attached to something. State managed by game mechanics.",
  },
  {
    bit: 29,
    label: "Burning",
    tooltip:
      "Item is on fire. Emits light and may cause fire damage. Bypasses canBeSeen.",
  },
  {
    bit: 30,
    label: "Charred",
    tooltip: "Item has been damaged by fire. May have reduced durability.",
  },
  // Bit 31 (ITEM_NOLOCATE) exists in C++ as unsigned int, but obj.action_flag
  // is a signed INT column. The C++ server round-trips it via signed/unsigned
  // reinterpretation (-2147483648), but JS computes 2^31 = 2147483648 which
  // overflows the signed column max of 2147483647, corrupting the bitfield.
  {
    bit: 31,
    disabledReason: "Overflows signed INT column (use in-game commands)",
    label: "Nolocate",
  },
];
