/**
 * Remove keys from an edits object whose values match the original entity.
 * Returns null when no actual changes remain, allowing `edits !== null`
 * dirty checks to work correctly after a user reverts a field.
 */
export function pruneEdits<T extends Record<string, unknown>>(
  next: Partial<T>,
  original: T,
): null | Partial<T> {
  const result: Partial<T> = {};
  let hasKeys = false;
  for (const k in next) {
    if (Object.hasOwn(next, k) && next[k] !== original[k]) {
      result[k] = next[k];
      hasKeys = true;
    }
  }
  return hasKeys ? result : null;
}
