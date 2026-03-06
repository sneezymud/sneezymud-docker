import type { BitfieldEntry } from "../types/enums.ts";

export const EXIT_FLAGS: BitfieldEntry[] = [
  {
    bit: 0,
    label: "Closed",
    tooltip: "The exit starts closed and must be opened to pass through.",
  },
  {
    bit: 1,
    label: "Locked",
    tooltip:
      "The exit starts locked and requires the matching key or lock picking to open. A shaman's Shadow Walk can bypass locked doors if their spell skill exceeds the lock difficulty.",
  },
  {
    bit: 2,
    label: "Secret",
    tooltip:
      "The exit is hidden from the exits list. Players must 'search' to discover it.",
  },
  {
    bit: 3,
    label: "Destroyed",
    tooltip:
      "The door has been destroyed (bashed down). It cannot be closed or locked.",
  },
  {
    bit: 4,
    disabledReason:
      "Don't set this on doors - it's managed by the game engine.",
    label: "No Enter",
  },
  {
    bit: 5,
    disabledReason:
      "Door traps are set in the zone file, not on the exit itself.",
    label: "Trapped",
  },
  {
    bit: 6,
    label: "Caved In",
    tooltip:
      "The exit is permanently blocked by a cave-in. No in-game mechanic can clear it - not digging, bashing, spells, or zone resets. Shadow Walk cannot bypass cave-ins. Only immortals and ghost-flagged mobs can pass. Must be removed by a builder.",
  },
  {
    bit: 7,
    label: "Warded",
    tooltip:
      "The exit is magically warded, blocking all mortal passage. Cannot be bashed. Shadow Walk cannot bypass wards. Only immortals and ghost-flagged mobs pass freely. Passage via a ward-key item requires a hardcoded mapping in the game source (movement.cc) - setting this flag alone creates an impassable barrier.",
  },
  {
    bit: 8,
    label: "Sloped Up",
    tooltip:
      "The exit slopes upward. Affects movement messages and some terrain checks.",
  },
  {
    bit: 9,
    label: "Sloped Down",
    tooltip:
      "The exit slopes downward. Affects movement messages and some terrain checks.",
  },
  {
    bit: 10,
    disabledReason: "Don't set this on doors - it's a runtime state.",
    label: "Jammed",
  },
];
