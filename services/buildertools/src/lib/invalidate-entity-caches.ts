import type { QueryClient } from "@tanstack/react-query";

import type { DashboardEntity } from "@/shared/schemas/publish.ts";

import { entityKeys } from "@/lib/entity-keys.ts";

type Scope =
  | { kind: "all" }
  | {
      kind: "single";
      type: DashboardEntity["type"];
      vnum: number;
    };

/**
 * Invalidate query caches after a publish or mutation.
 *
 * Uses `entityKeys` for the new owner-aware cache key shapes. Prefix-matching
 * via `invalidateQueries({ queryKey: entityKeys.all(type) })` catches all
 * detail/diff/list variants for that entity type in one call.
 *
 * Also invalidates the legacy key prefixes (`["rooms"]`, `["mobs"]`,
 * `["objects"]`) because list components and entity pickers still use them.
 */
export async function invalidateEntityCaches(
  queryClient: QueryClient,
  scope: Scope,
): Promise<void> {
  const ENTITY_TYPES: Array<DashboardEntity["type"]> = [
    "room",
    "mob",
    "mob-response",
    "object",
  ];
  // Legacy key prefixes still used by list components and entity pickers
  const LEGACY_PREFIXES: Record<DashboardEntity["type"], readonly string[]> = {
    mob: ["mobs"],
    "mob-response": ["mobs"],
    object: ["objects"],
    room: ["rooms"],
  };

  const dashboard = queryClient.invalidateQueries({
    queryKey: ["publish-dashboard"],
  });

  const entityInvalidations =
    scope.kind === "single"
      ? [
          // New entityKeys shape - prefix match covers detail + diff + list variants
          queryClient.invalidateQueries({
            queryKey: entityKeys.all(scope.type),
          }),
          // Legacy keys for list components and entity pickers
          queryClient.invalidateQueries({
            queryKey: LEGACY_PREFIXES[scope.type],
          }),
        ]
      : // Invalidate all entity caches (both new and legacy shapes)
        ENTITY_TYPES.flatMap((type) => [
          queryClient.invalidateQueries({ queryKey: entityKeys.all(type) }),
          queryClient.invalidateQueries({ queryKey: LEGACY_PREFIXES[type] }),
        ]);

  await Promise.all([dashboard, ...entityInvalidations]);
}
