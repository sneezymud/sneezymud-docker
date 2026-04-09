/**
 * Structural deep equality. Handles primitives, arrays, and plain objects.
 *
 * Used by entity-diff.tsx to replace the previous JSON.stringify-based
 * comparison. NOT used by dashboard fieldsEqual - the dashboard's comparison
 * is field-list-driven and deliberately excludes owner/meta columns, which
 * deepEqual would include.
 *
 * Uses `Object.entries(obj: object)` (which returns `[string, unknown][]`)
 * to walk the object shape without needing an indexed-read `as` cast. This
 * keeps the implementation free of `no-unsafe-type-assertion` violations
 * while still handling nested objects and arrays.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((ai, i) => deepEqual(ai, b[i]));
  }
  if (Array.isArray(b)) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  // Both are non-null, non-array objects. Object.entries returns
  // [string, unknown] pairs, avoiding the need for a Record cast.
  const entriesA = Object.entries(a);
  const entriesB = Object.entries(b);
  if (entriesA.length !== entriesB.length) return false;
  // Map lookup makes the comparison order-independent.
  const bMap = new Map<string, unknown>(entriesB);
  for (const [k, va] of entriesA) {
    if (!bMap.has(k)) return false;
    if (!deepEqual(va, bMap.get(k))) return false;
  }
  return true;
}
