// Bit constants for exit condition flags
export const EXIT_CLOSED = Math.trunc(1);
export const EXIT_LOCKED = 1 << 1;
export const EXIT_SECRET = 1 << 2;
export const EXIT_DESTROYED = 1 << 3;
export const EXIT_CAVED_IN = 1 << 6;
export const EXIT_SLOPED_UP = 1 << 8;
export const EXIT_SLOPED_DOWN = 1 << 9;

/** Enforce mutual exclusivity rules matching C++ redit (create_rooms.cc) */
export function enforceExitFlagRules(
  oldFlags: number,
  newFlags: number,
): number {
  const toggled = oldFlags ^ newFlags;
  const turnedOn = toggled & newFlags;
  let flags = newFlags;

  if (turnedOn & EXIT_DESTROYED) {
    flags &= ~(EXIT_CLOSED | EXIT_LOCKED | EXIT_SECRET);
  }

  if (turnedOn & EXIT_CAVED_IN) {
    flags |= EXIT_CLOSED;
    flags &= ~(EXIT_LOCKED | EXIT_SECRET);
  }

  if (turnedOn & EXIT_SLOPED_UP) {
    flags &= ~EXIT_SLOPED_DOWN;
  }

  if (turnedOn & EXIT_SLOPED_DOWN) {
    flags &= ~EXIT_SLOPED_UP;
  }

  return flags;
}
