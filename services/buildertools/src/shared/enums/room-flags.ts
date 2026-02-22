import type { BitfieldEntry } from "./types.ts";

export const ROOM_FLAGS: BitfieldEntry[] = [
  {
    bit: 0,
    label: "Always Lit",
    tooltip:
      "The room is permanently illuminated regardless of time of day or light sources. Players can always see here.",
  },
  {
    bit: 1,
    label: "Death",
    tooltip:
      "Instant death room. Any mortal entering is killed immediately. Use with extreme caution - typically for fall-to-death or lava rooms.",
  },
  {
    bit: 2,
    label: "No Mob",
    tooltip:
      "Prevents NPCs from entering or being loaded into this room. Does not affect players. Useful for safe rooms or areas where mobs would break immersion.",
  },
  {
    bit: 3,
    label: "Indoors",
    tooltip:
      "Room has a ceiling. Affects weather messages, flying mechanics, room height checks, and many spells. Auto-managed with Room Height: setting height 1-1000 sets this flag, height -1 clears it.",
  },
  {
    bit: 4,
    label: "Peaceful",
    tooltip:
      "No combat is allowed in this room. Players and mobs cannot attack, and aggressive mobs will not initiate fights. Different from No Mob - mobs can still enter, they just can't fight.",
  },
  {
    bit: 5,
    label: "No Steal",
    tooltip: "The steal skill cannot be used in this room.",
  },
  {
    bit: 6,
    label: "No Escape",
    tooltip:
      "Characters cannot flee or retreat from combat in this room. They must fight to the death or use other means of escape.",
  },
  {
    bit: 7,
    label: "No Magic",
    tooltip:
      "All spell casting is blocked in this room. Existing spell effects on characters still function, but no new spells can be cast.",
  },
  {
    bit: 8,
    label: "No Portal",
    tooltip:
      "Portal and gate spells cannot target this room as a destination. Characters also cannot portal out from this room.",
  },
  {
    bit: 9,
    label: "Private",
    tooltip:
      "Limits the room to 2 occupants. Additional characters are blocked from entering. Used for private meeting rooms or intimate scenes.",
  },
  {
    bit: 10,
    label: "Silence",
    tooltip:
      "No communication commands work in this room - no say, shout, tell, or other speech. Spells with verbal components may also be affected.",
  },
  {
    bit: 11,
    label: "No Order",
    tooltip:
      "The 'order' command cannot be used in this room. Followers and charmed mobs cannot be commanded here.",
  },
  {
    bit: 12,
    label: "No Flee",
    tooltip:
      "Characters cannot use the flee command in this room. Similar to No Escape but specifically targets the flee command.",
  },
  {
    bit: 13,
    label: "Have to Walk",
    tooltip:
      "Flying and mounted movement is not allowed. Characters must walk through this room on foot.",
  },
  {
    bit: 14,
    label: "Arena",
    tooltip:
      "PvP combat is allowed in this room regardless of other settings. Deaths in arena rooms may have different consequences than normal deaths.",
  },
  {
    bit: 15,
    label: "No Heal",
    tooltip:
      "Natural HP/mana regeneration does not occur in this room. Healing spells may still work.",
  },
  {
    bit: 16,
    label: "Hospital",
    tooltip:
      "Enhanced healing rate in this room. Characters recover HP, mana, and movement faster than normal. Typically used for healer shops and rest areas.",
  },
  {
    bit: 17,
    label: "Save Room",
    tooltip:
      "Room data persists across zone resets. Should be set on virtually all builder-created rooms. Without this flag, room changes may be lost on zone reset.",
  },
  {
    bit: 18,
    label: "No Autoformat",
    tooltip:
      "Bypasses automatic description formatting when saving. Use when the room description requires specific manual formatting that the auto-formatter would break.",
  },
  {
    bit: 19,
    disabledReason: "Managed by the server during active editing sessions.",
    label: "Being Edited",
  },
  {
    bit: 20,
    disabledReason:
      "Runtime state set by fire spells - not a builder-settable property.",
    label: "On Fire",
  },
  {
    bit: 21,
    disabledReason:
      "Runtime state set by flooding events - not a builder-settable property.",
    label: "Flooded",
  },
];
