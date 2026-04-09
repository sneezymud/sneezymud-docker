import type { DashboardEntity } from "@/shared/schemas/publish.ts";

type Type = DashboardEntity["type"];

/**
 * TanStack Query cache key builder. The canonical owner is `undefined` when
 * the target equals the current user, matching the URL rule from ownerParam.
 * This keeps cache keys and URLs in lockstep.
 */
export const entityKeys = {
  all: (type: Type) => ["entity", type] as const,
  detail: (type: Type, vnum: number, canonicalOwner: number | undefined) =>
    ["entity", type, vnum, canonicalOwner] as const,
  diff: (type: Type, vnum: number, canonicalOwner: number | undefined) =>
    ["entity", type, "diff", vnum, canonicalOwner] as const,
  list: (type: Type, ownerFilter: "all" | "mine" | number) =>
    ["entity", type, "list", ownerFilter] as const,
} as const;

/**
 * Compute the canonical owner for a cache key. Returns `undefined` when the
 * target equals the current user (matching the URL rule). This is the single
 * source of truth for the `canonicalOwner` value.
 */
export function canonicalOwner(
  targetPlayerId: number | undefined,
  currentUserId: number,
): number | undefined {
  if (targetPlayerId === undefined || targetPlayerId === currentUserId) {
    return undefined;
  }
  return targetPlayerId;
}

/**
 * Build the `?owner=` URL suffix from the canonical owner value.
 *
 * Accepts the output of `canonicalOwner()` rather than raw (owner, playerId)
 * inputs. Use this in TanStack Query `queryFn` callbacks so the lint rule
 * sees only `cOwner` (which is in the query key) as the external dependency.
 */
export function ownerSuffix(cOwner: number | undefined): string {
  return cOwner === undefined ? "" : `?owner=${cOwner}`;
}
