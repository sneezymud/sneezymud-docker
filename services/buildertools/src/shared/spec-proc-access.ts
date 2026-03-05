import type { EnumEntry } from "./enums/types.ts";

/**
 * Spec proc assignability data from C++ mob_specials[], obj_specials[],
 * room_specials[] arrays. Unassignable procs require the entity type's
 * imp power to set via builder tools.
 */

// Mob spec procs where assignable = false (require MEDIT_IMP_POWER)
const UNASSIGNABLE_MOB_SPEC_PROCS = new Set([
  3, 6, 7, 12, 14, 15, 18, 19, 20, 21, 24, 25, 28, 29, 30, 31, 32, 33, 34, 35,
  36, 37, 38, 43, 44, 45, 46, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 78, 79, 80,
  81, 82, 83, 84, 85, 87, 91, 92, 93, 94, 95, 103, 104, 105, 106, 107, 108, 109,
  110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124,
  125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139,
  140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 154, 155, 156, 157,
  158, 159, 160, 162, 164, 165, 166, 167, 168, 169, 170, 172, 173, 174, 175,
  176, 177, 178, 179, 181, 182, 185, 186, 187, 188, 189, 190, 191, 192, 193,
  195, 196, 197, 198, 199, 200, 202, 203, 204, 206, 207, 208, 209, 210, 211,
  212, 213, 216, 217, 218,
]);

// Object spec procs where assignable = false (require OEDIT_IMP_POWER)
const UNASSIGNABLE_OBJ_SPEC_PROCS = new Set([
  5, 6, 7, 8, 9, 10, 11, 17, 19, 20, 21, 26, 27, 28, 34, 36, 38, 39, 40, 41, 42,
  44, 46, 47, 48, 54, 55, 57, 58, 59, 61, 63, 64, 65, 66, 67, 68, 69, 71, 72,
  73, 74, 76, 77, 78, 79, 80, 81, 82, 84, 85, 87, 88, 89, 91, 92, 93, 94, 96,
  97, 98, 99, 100, 101, 105, 106, 107, 108, 109, 113, 114, 115, 116, 119, 120,
  121, 122, 123, 124, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136,
  137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151,
  152, 153, 154, 155, 156, 163,
]);

// Room spec procs: only 0 (none) and 33 (blazingroom) are assignable
const ASSIGNABLE_ROOM_SPEC_PROCS = new Set([0, 33]);

export function isUnassignableMobSpecProc(value: number): boolean {
  return UNASSIGNABLE_MOB_SPEC_PROCS.has(value);
}

export function isUnassignableObjSpecProc(value: number): boolean {
  return UNASSIGNABLE_OBJ_SPEC_PROCS.has(value);
}

export function isUnassignableRoomSpecProc(value: number): boolean {
  return value !== 0 && !ASSIGNABLE_ROOM_SPEC_PROCS.has(value);
}

/**
 * Add disabledReason to enum entries that are unassignable,
 * for use in dropdowns when the user lacks the imp power.
 */
export function gateSpecProcs(
  entries: EnumEntry[],
  isUnassignable: (value: number) => boolean,
): EnumEntry[] {
  return entries.map((e) =>
    isUnassignable(e.value)
      ? {
          ...e,
          disabledReason: e.disabledReason ?? "Requires higher immortal power",
        }
      : e,
  );
}
