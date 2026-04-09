import { inArray } from "drizzle-orm";

import { sneezyDb } from "../db.ts";
import { player } from "../schema/sneezy.ts";

/**
 * Resolve a set of playerIds to their character names by querying sneezy.player.
 * Returns a Map; unresolved ids are logged and omitted (callers render "Unknown").
 *
 * This exists because the immortal and sneezy DBs have separate Drizzle
 * connection wrappers, so cross-pool joins can't be expressed in a single
 * Drizzle query. All callers that need owner names on immortal rows must
 * use this post-query resolution.
 */
export async function resolvePlayerNames(
  playerIds: readonly number[],
): Promise<Map<number, string>> {
  if (playerIds.length === 0) return new Map();
  const unique = [...new Set(playerIds)];
  const rows = await sneezyDb
    .select({ id: player.id, name: player.name })
    .from(player)
    .where(inArray(player.id, unique));
  const result = new Map<number, string>();
  for (const row of rows) {
    result.set(row.id, row.name);
  }
  const missing = unique.filter((id) => !result.has(id));
  if (missing.length > 0) {
    console.warn(
      `resolvePlayerNames: unresolved player ids: ${missing.join(", ")}`,
    );
  }
  return result;
}
