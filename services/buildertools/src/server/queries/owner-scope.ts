import type { MySqlColumn } from "drizzle-orm/mysql-core";

import { eq } from "drizzle-orm";

export type OwnerScope = "all" | { playerId: number };

/** WHERE condition for player_id-scoped queries. Returns undefined for "all" scope
 * (drizzle's and() ignores undefined operands). */
export function ownerEq(playerIdColumn: MySqlColumn, scope: OwnerScope) {
  if (scope === "all") return;
  return eq(playerIdColumn, scope.playerId);
}

/** Extract player_id for INSERTs. Throws on "all" - creating/updating
 * entities always requires a specific owner. */
export function scopePlayerId(scope: OwnerScope): number {
  if (scope === "all")
    throw new Error("Cannot insert without a specific owner");
  return scope.playerId;
}
