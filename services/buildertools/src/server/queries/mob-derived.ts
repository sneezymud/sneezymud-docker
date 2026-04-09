/**
 * Derive the `letter` and `pos` values for a mob from its raw fields.
 *
 * These are computed fields written to the sneezy `mob` table at publish time
 * and also used by the dashboard's "modified" comparison. All three call sites
 * (publishMobTx, updateMob, findModifiedMobs) MUST use the same derivation or
 * the dashboard will report false positives.
 *
 * Rule (preserved exactly from the existing implementations):
 * - `letter` is `"A"` when local_sound is truthy AND adjacent_sound is falsy.
 *   Otherwise `"L"`. Null/undefined sound fields are falsy.
 * - `pos` is always `def_position` (no transformation).
 */
export function deriveMobLetterAndPos(mob: {
  adjacent_sound: null | string;
  def_position: number;
  local_sound: null | string;
}): { letter: string; pos: number } {
  const letter = mob.local_sound && !mob.adjacent_sound ? "A" : "L";
  return { letter, pos: mob.def_position };
}
