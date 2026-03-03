import type { MySqlColumn } from "drizzle-orm/mysql-core";

import { eq } from "drizzle-orm";

export type OwnerScope = "all" | { owner: string };

/** WHERE condition for owner-scoped queries. Returns undefined for "all" scope
 * (drizzle's and() ignores undefined operands). */
export function ownerEq(ownerColumn: MySqlColumn, scope: OwnerScope) {
  if (scope === "all") return;
  return eq(ownerColumn, scope.owner);
}

/** Extract owner string for INSERTs. Throws on "all" - creating/updating
 * entities always requires a specific owner. */
export function scopeOwner(scope: OwnerScope): string {
  if (scope === "all")
    throw new Error("Cannot insert without a specific owner");
  return scope.owner;
}
