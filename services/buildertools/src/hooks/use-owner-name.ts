import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch } from "@/shared/api-client.ts";

const playerNameSchema = z.object({
  id: z.number(),
  name: z.string(),
});

/**
 * Resolve a player's display name for the EntityHeader "Owned by" badge.
 *
 * Returns `undefined` while loading or when `playerId` is `undefined` (self),
 * the player name on success, or `"Unknown"` on fetch failure. The header
 * badge is informational, not blocking, so errors are swallowed.
 */
export function useOwnerName(playerId: number | undefined): string | undefined {
  const query = useQuery({
    enabled: playerId !== undefined,
    queryFn: async () => {
      try {
        return await apiFetch(`/api/players/${playerId}`, playerNameSchema);
      } catch {
        // enabled guard ensures playerId is defined when queryFn runs;
        // the id field is only for schema conformance and is never consumed
        return { id: playerId ?? 0, name: "Unknown" };
      }
    },
    queryKey: ["player-name", playerId],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return query.data?.name;
}
