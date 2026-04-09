import { useEffect, useState } from "react";

type OwnerFilter = "all" | "mine";

/**
 * Persists the owner filter toggle per entity type and user in localStorage.
 * Non-senior users are normalized to "mine" even if localStorage contains "all"
 * (e.g. after a permission downgrade).
 */
export function useOwnerFilter({
  isSenior,
  playerId,
  type,
}: {
  isSenior: boolean;
  playerId: number;
  type: string;
}): [OwnerFilter, (v: OwnerFilter) => void] {
  const storageKey = `buildertools-${type}-list-owner-filter-${playerId}`;

  const [filter, setFilter] = useState<OwnerFilter>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "all" && isSenior) return "all";
      if (stored === "all") {
        localStorage.setItem(storageKey, "mine");
      }
    } catch {
      // localStorage unavailable
    }
    return "mine";
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, filter);
    } catch {
      // localStorage unavailable
    }
  }, [storageKey, filter]);

  return [filter, setFilter];
}
