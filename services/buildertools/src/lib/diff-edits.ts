/**
 * Compare an edits object against the original entity and return only keys
 * that actually changed. Returns null when no real changes remain - this is
 * load-bearing for dirty detection (`edits !== null`).
 */
export function diffEdits<T extends Record<string, unknown>>(
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
