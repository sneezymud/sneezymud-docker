/**
 * Escape LIKE metacharacters so user input is treated literally.
 * Parameterized queries prevent SQL injection, but `%` and `_` still
 * act as wildcards inside LIKE patterns.
 */
export function escapeLike(query: string): string {
  return query.replaceAll(/[%_\\]/g, String.raw`\$&`);
}
