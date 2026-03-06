import type { BitfieldEntry } from "../types/enums.ts";

export const MOB_ACTIONS: BitfieldEntry[] = [
  {
    bit: 0,
    disabledReason: "Auto-managed by the server when mob strings change",
    label: "Strings Changed",
  },
  {
    bit: 1,
    label: "Sentinel",
    tooltip:
      "Mob stays in its spawn room and never wanders. Aggressive sentinels only attack players in their home room.",
  },
  {
    bit: 2,
    label: "Scavenger",
    tooltip:
      "Increases the mob's greed stat at spawn, making it more likely to pick up items from the ground.",
  },
  {
    bit: 3,
    disabledReason: "Runtime state set by spells and disciplines",
    label: "Disguised",
  },
  {
    bit: 4,
    label: "Nice Thief",
    tooltip:
      "Halves the mob's default greed (50 to 25) and reduces suspicion by 15. Lower greed keeps it well below the scavenging threshold so it won't pick up items. Lower suspicion makes it respond to player emotes with friendly reactions instead of escalating anger. Does not affect whether thief-class mobs steal from players.",
  },
  {
    bit: 5,
    label: "Aggressive",
    tooltip:
      "Mob attacks all visible players on sight every 1.2 seconds. Without this flag, mobs only attack players whose karma is low enough relative to the mob's intelligence and anger. This flag bypasses that check entirely and also raises default anger (+50) and malice (+25).",
  },
  {
    bit: 6,
    label: "Stay Zone",
    tooltip:
      "Mob can wander within its home zone but will not cross zone boundaries, even in pursuit.",
  },
  {
    bit: 7,
    label: "Wimpy",
    tooltip:
      "Mob only attacks sleeping or unconscious targets (even if aggressive), flees automatically below 10% HP, and moves away from nearby fights.",
  },
  {
    bit: 8,
    label: "Annoying",
    tooltip:
      "Other aggressive mobs will treat this mob as a valid attack target, as if it were a player character.",
  },
  {
    bit: 9,
    disabledReason: "Runtime combat state",
    label: "Hateful",
  },
  {
    bit: 10,
    disabledReason: "Runtime combat state",
    label: "Afraid",
  },
  {
    bit: 11,
    label: "Immortal",
    tooltip:
      "Mob is completely invulnerable - cannot be attacked, targeted by spells or skills, or hit by AoE. Required for shopkeepers. Cannot combine with Protector or Protectee.",
  },
  {
    bit: 12,
    disabledReason: "Runtime combat state",
    label: "Hunting",
  },
  {
    bit: 13,
    disabledReason: "Runtime combat state",
    label: "Deadly",
  },
  {
    bit: 14,
    disabledReason: "Runtime combat state",
    label: "Polyself",
  },
  {
    bit: 15,
    disabledReason: "Runtime combat state",
    label: "Guardian",
  },
  {
    bit: 16,
    label: "Skeleton",
    tooltip:
      "Undead type with full undead immunities (poison, bleed, fear, etc.) plus immunity to flesh and muscle criticals, but maximum vulnerability to bone attacks. Charmed skeletons do not heal limbs. Cannot combine with Zombie or Ghost.",
  },
  {
    bit: 17,
    label: "Zombie",
    tooltip:
      "Undead type with full undead immunities. Charmed zombies actively decay, losing limbs over time. Produces poison instead of blood. Cannot combine with Skeleton or Ghost.",
  },
  {
    bit: 18,
    label: "Ghost",
    tooltip:
      "Undead type with all undead and body-part critical immunities, plus the ability to pass through closed doors and cave-ins. Cannot combine with Skeleton or Zombie.",
  },
  {
    bit: 19,
    label: "Diurnal",
    tooltip:
      "Mob is active only during the day; removed from the world at night and returns at dawn. Charmed versions stay active at night. Cannot combine with Nocturnal.",
  },
  {
    bit: 20,
    label: "Nocturnal",
    tooltip:
      "Mob is active only at night; removed from the world at dawn and returns at dusk. Charmed versions stay active during the day. Cannot combine with Diurnal.",
  },
  {
    bit: 21,
    label: "Protector",
    tooltip:
      "Mob automatically assists same-faction Protectee mobs that are under attack in the same room. Cannot combine with Immortal.",
  },
  {
    bit: 22,
    label: "Protectee",
    tooltip:
      "Marks the mob as a target for same-faction Protector mobs to defend. Does nothing without a Protector nearby. Cannot combine with Immortal.",
  },
  {
    bit: 23,
    disabledReason: "Runtime PK combat state",
    label: "Hit by PK",
  },
];
