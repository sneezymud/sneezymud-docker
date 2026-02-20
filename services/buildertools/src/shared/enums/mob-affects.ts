import type { BitfieldEntry } from "./types.ts";

export const MOB_AFFECTS: BitfieldEntry[] = [
  {
    bit: 0,
    label: "Blind",
    tooltip:
      "Mob cannot see - blocks looking, reading, navigation, spell targeting, and being trained. Overridden by True Sight or Clarity.",
  },
  {
    bit: 1,
    label: "Invisible",
    tooltip:
      "Mob is invisible without Detect Invisible. Automatically stripped when the mob attacks or deals damage.",
  },
  {
    bit: 2,
    label: "Swim",
    tooltip:
      "Mob can enter and move through water rooms with guaranteed success (no swim check or encumbrance penalty), at half movement cost in water and quarter cost underwater. Required for any aquatic mob that needs to wander through water sectors.",
  },
  {
    bit: 3,
    label: "Detect Invisible",
    tooltip:
      "Mob can see invisible creatures and objects. Level 70+ mobs get this randomly on spawn; setting it here guarantees the ability.",
  },
  {
    bit: 4,
    label: "Detect Magic",
    tooltip:
      "Mob perceives magical auras on items (blue glow in descriptions). Purely perceptual with no combat effect.",
  },
  {
    bit: 5,
    label: "Sense Life",
    tooltip:
      'Display-only flag: the mob\'s observer sees hidden or invisible mortals as "a hidden life form." Does not feed into mob AI - the mob cannot target, attack, or interact with sensed creatures. For mobs that should detect hidden players, use Detect Invisible instead.',
  },
  {
    bit: 6,
    label: "Levitating",
    tooltip:
      "Mob floats off the ground, preventing sinking or drowning in water rooms. Does not grant full flight for air sectors.",
  },
  {
    bit: 7,
    label: "Sanctuary",
    tooltip:
      "Reduces all incoming damage by 50% when set as a mob flag (25% max when cast by spell). Mob glows with a bright white light. Can be removed by Dispel Magic or Chase Spirit (saving throw applies), but once removed it does not come back until the mob repops.",
  },
  {
    bit: 8,
    disabledReason: "Auto-managed by the group system",
    label: "Group",
  },
  {
    bit: 9,
    disabledReason: "Runtime spell effect",
    label: "Web",
  },
  {
    bit: 10,
    disabledReason: "Runtime spell effect",
    label: "Curse",
  },
  {
    bit: 11,
    label: "Flying",
    tooltip:
      "Grants magical flight, allowing the mob to enter air and flying sector rooms. Do NOT set this on winged races (bird, dragon, bat, etc.) - they fly naturally via their race and setting this flag logs a warning. Use this only for non-winged creatures that need flight (e.g., a floating magical construct).",
  },
  {
    bit: 12,
    disabledReason: "Runtime spell effect",
    label: "Poison",
  },
  {
    bit: 13,
    disabledReason: "Runtime combat state",
    label: "Stunned",
  },
  {
    bit: 14,
    disabledReason: "Runtime spell effect",
    label: "Paralysis",
  },
  {
    bit: 15,
    label: "Infravision",
    tooltip:
      "Mob can see warm-blooded creatures in darkness, with bonuses at night and in cold environments. Cold-blooded creatures (reptiles, undead) remain invisible to it.",
  },
  {
    bit: 16,
    label: "Waterbreath",
    tooltip:
      "Mob can enter and survive underwater without drowning, swim checks, or speech garbling. Permanent and cannot be removed by any spell or mechanic for the life of the mob instance. Essential for mobs that live in or patrol underwater zones.",
  },
  {
    bit: 17,
    disabledReason: "Runtime spell effect",
    label: "Sleep",
  },
  {
    bit: 18,
    disabledReason: "Runtime spell effect",
    label: "Scrying",
  },
  {
    bit: 19,
    label: "Sneak",
    tooltip:
      "Permanent innate trait when set as a mob flag (unlike the player skill version, it is never stripped by combat or other actions). Mob moves quietly (reduced noise detection), gets triple benefit from shadowy equipment, and thief-class mobs get +5 attack bonus when initiating combat.",
  },
  {
    bit: 20,
    label: "Hide",
    tooltip:
      "Sets the mob's initial spawn state to hidden (harder to see, scaling with level), with +5 attack bonus for thief-class on the opening strike. Stripped on almost any action except backstab, and the mob AI does not re-apply it - this only controls the mob's state on first load until it acts.",
  },
  {
    bit: 21,
    disabledReason: "Runtime combat state (anti-flee debuff)",
    label: "Shocked",
  },
  {
    bit: 22,
    disabledReason: "Runtime spell effect",
    label: "Charm",
  },
  {
    bit: 23,
    disabledReason: "Runtime disease effect",
    label: "Syphilis",
  },
  {
    bit: 24,
    label: "Shadow Walk",
    tooltip:
      "Mob is invisible in dim light (below illumination threshold 14) and can pass through closed doors if the mob's Shadow Walk spell learnedness exceeds the door's lock difficulty (deterministic, no random roll).",
  },
  {
    bit: 25,
    label: "True Sight",
    tooltip:
      "Complete blindness immunity and +25 vision bonus, allowing sight in any darkness. Prevents all blind effects from being applied.",
  },
  {
    bit: 26,
    disabledReason: "Runtime state set by corpse-eating spec proc",
    label: "Munching Corpse",
  },
  {
    bit: 27,
    disabledReason: "Runtime combat state (riposte skill)",
    label: "Riposte",
  },
  {
    bit: 28,
    label: "Silent",
    tooltip:
      "Mob cannot speak in any channel (say, shout, tell, ask) or recite scrolls. Does not block spellcasting or combat actions.",
  },
  {
    bit: 29,
    disabledReason: "Runtime combat state (engagement tracking)",
    label: "Engager",
  },
  {
    bit: 30,
    disabledReason: "Runtime combat state (set automatically on attack)",
    label: "Aggressor",
  },
  {
    bit: 31,
    label: "Clarity",
    tooltip:
      "Identical to True Sight - blindness immunity and +25 vision bonus. The two flags are interchangeable; the distinction is only which spell grants them.",
  },
  // Bits 32-34 exist in the C++ server as uint64_t runtime flags, but the
  // mob.affects DB column is unsigned INT (max 2^32-1). These flags are set by
  // game commands (preen, focus_attack, orient) and never stored in the DB.
  {
    bit: 32,
    disabledReason: "Runtime-only flag (overflows DB column)",
    label: "Flightworthy",
  },
  {
    bit: 33,
    disabledReason: "Runtime-only flag (overflows DB column)",
    label: "Focus Attack",
  },
  {
    bit: 34,
    disabledReason: "Runtime-only flag (overflows DB column)",
    label: "Orient",
  },
];
