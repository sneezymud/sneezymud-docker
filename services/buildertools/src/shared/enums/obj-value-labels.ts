// Maps item type value -> labels/help text for the 4 type-specific value fields.
// Only types with known semantics are listed; unlisted types use generic labels.

interface ValueFieldLabels {
  help: string;
  label: string;
}

type ValueLabels = [
  ValueFieldLabels,
  ValueFieldLabels,
  ValueFieldLabels,
  ValueFieldLabels,
];

const OBJ_VALUE_LABELS: Record<number, ValueLabels> = {
  // Light (1)
  1: [
    { help: "Color (0 = normal)", label: "Color" },
    { help: "Unused", label: "Value 1" },
    {
      help: "Hours of light remaining (0 = burnt out, -1 = infinite)",
      label: "Hours",
    },
    { help: "Unused", label: "Value 3" },
  ],
  // Scroll (2)
  2: [
    { help: "Spell level", label: "Spell Level" },
    { help: "Spell number 1", label: "Spell 1" },
    { help: "Spell number 2 (0 = none)", label: "Spell 2" },
    { help: "Spell number 3 (0 = none)", label: "Spell 3" },
  ],
  // Wand (3)
  3: [
    { help: "Spell level", label: "Spell Level" },
    { help: "Max charges", label: "Max Charges" },
    { help: "Current charges", label: "Charges Left" },
    { help: "Spell number", label: "Spell" },
  ],
  // Staff (4)
  4: [
    { help: "Spell level", label: "Spell Level" },
    { help: "Max charges", label: "Max Charges" },
    { help: "Current charges", label: "Charges Left" },
    { help: "Spell number", label: "Spell" },
  ],
  // Weapon (5)
  5: [
    { help: "Unused", label: "Value 0" },
    { help: "Number of damage dice", label: "Dice Count" },
    { help: "Size of damage dice", label: "Dice Size" },
    { help: "Damage type", label: "Damage Type" },
  ],
  // Armor (9)
  9: [
    { help: "AC bonus applied", label: "AC Apply" },
    { help: "Unused", label: "Value 1" },
    { help: "Unused", label: "Value 2" },
    { help: "Unused", label: "Value 3" },
  ],
  // Potion (10)
  10: [
    { help: "Spell level", label: "Spell Level" },
    { help: "Spell number 1", label: "Spell 1" },
    { help: "Spell number 2 (0 = none)", label: "Spell 2" },
    { help: "Spell number 3 (0 = none)", label: "Spell 3" },
  ],
  // Trap (14)
  14: [
    { help: "Trap type", label: "Trap Type" },
    { help: "Trap damage", label: "Damage" },
    { help: "Trap charges", label: "Charges" },
    { help: "Trap level", label: "Level" },
  ],
  // Chest/Container (15)
  15: [
    { help: "Max weight capacity", label: "Capacity" },
    {
      help: "Container flags (1=closeable, 2=pickproof, 4=closed, 8=locked)",
      label: "Flags",
    },
    { help: "Key vnum (0 = no key)", label: "Key Vnum" },
    { help: "Unused", label: "Value 3" },
  ],
  // Drink Container (17)
  17: [
    { help: "Max drink units", label: "Capacity" },
    { help: "Current drink units", label: "Current" },
    { help: "Liquid type", label: "Liquid Type" },
    { help: "Poisoned flag (1 = poisoned)", label: "Poisoned" },
  ],
  // Food (19)
  19: [
    { help: "Hours of hunger filled", label: "Fill Hours" },
    { help: "Unused", label: "Value 1" },
    { help: "Unused", label: "Value 2" },
    { help: "Poisoned flag (1 = poisoned)", label: "Poisoned" },
  ],
  // Money (20)
  20: [
    { help: "Number of gold coins", label: "Gold Amount" },
    { help: "Unused", label: "Value 1" },
    { help: "Unused", label: "Value 2" },
    { help: "Unused", label: "Value 3" },
  ],
  // Bow (25)
  25: [
    { help: "Unused", label: "Value 0" },
    { help: "Number of damage dice", label: "Dice Count" },
    { help: "Size of damage dice", label: "Dice Size" },
    { help: "Range in rooms", label: "Range" },
  ],
  // Arrow (26)
  26: [
    { help: "Unused", label: "Value 0" },
    { help: "Number of bonus damage dice", label: "Bonus Dice" },
    { help: "Size of bonus damage dice", label: "Bonus Dice Size" },
    { help: "Arrow type", label: "Arrow Type" },
  ],
  // Portal (32)
  32: [
    { help: "Destination room vnum", label: "Destination" },
    { help: "Portal type (0=normal, 1=random)", label: "Portal Type" },
    { help: "Unused", label: "Value 2" },
    { help: "Unused", label: "Value 3" },
  ],
  // Martial Weapon (44)
  44: [
    { help: "Unused", label: "Value 0" },
    { help: "Number of damage dice", label: "Dice Count" },
    { help: "Size of damage dice", label: "Dice Size" },
    { help: "Damage type", label: "Damage Type" },
  ],
};

const DEFAULT_VALUE_LABELS: ValueLabels = [
  { help: "Meaning depends on item type", label: "Value 0" },
  { help: "Meaning depends on item type", label: "Value 1" },
  { help: "Meaning depends on item type", label: "Value 2" },
  { help: "Meaning depends on item type", label: "Value 3" },
];

export function getObjValueLabels(itemType: number): ValueLabels {
  return OBJ_VALUE_LABELS[itemType] ?? DEFAULT_VALUE_LABELS;
}
