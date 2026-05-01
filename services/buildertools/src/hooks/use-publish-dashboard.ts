import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { invalidateEntityCaches } from "@/lib/invalidate-entity-caches.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { okResponseSchema } from "@/shared/schemas/common.ts";
import {
  type BulkPublishRequest,
  type DashboardEntity,
  dashboardResponseSchema,
} from "@/shared/schemas/publish.ts";
import { toastError } from "@/shared/toast.ts";
import { useAuthStore } from "@/state/auth.ts";

const DASHBOARD_KEY = ["publish-dashboard"] as const;

export function entityKey({ playerId, type, vnum }: DashboardEntity): string {
  return `${playerId}:${type}:${vnum}`;
}

export function usePublishDashboard() {
  const user = useAuthStore((s) => s.user);

  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">(() => {
    if (!user || typeof localStorage === "undefined") return "mine";
    const stored = localStorage.getItem(dashboardStorageKey(user.playerId));
    if (stored === "all") {
      if (!user.isSenior) {
        // Normalize the stored value so subsequent loads are consistent.
        localStorage.setItem(dashboardStorageKey(user.playerId), "mine");
        return "mine";
      }
      return "all";
    }
    return "mine";
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(dashboardStorageKey(user.playerId), ownerFilter);
    }
  }, [ownerFilter, user]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const queryClient = useQueryClient();

  const {
    data: entities,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () =>
      apiFetch(
        `/api/publish/dashboard?owner=${ownerFilter}`,
        dashboardResponseSchema,
      ),
    queryKey: [...DASHBOARD_KEY, ownerFilter],
  });

  const publishMutation = useMutation({
    mutationFn: (items: BulkPublishRequest["entities"]) =>
      apiFetch("/api/publish/bulk", okResponseSchema, {
        body: JSON.stringify({ entities: items }),
        method: "POST",
        signal: AbortSignal.timeout(60_000),
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Publish failed",
      );
    },
    onSuccess: async (_data, items) => {
      toast.success(
        `Published ${items.length} ${items.length === 1 ? "entity" : "entities"} to production`,
      );
      setSelected(new Set());
      await invalidateEntityCaches(queryClient, { kind: "all" });
    },
  });

  // Group entities by type
  const grouped = new Map<string, DashboardEntity[]>();
  if (entities) {
    for (const entity of entities) {
      const group = grouped.get(entity.type) ?? [];
      group.push(entity);
      grouped.set(entity.type, group);
    }
  }

  const allKeys = entities?.map(entityKey) ?? [];
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = allKeys.some((k) => selected.has(k));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const _setOwnerFilter = (v: "all" | "mine") => {
    setOwnerFilter(v);
    setSelected(new Set());
  };

  const selectedEntities = (entities ?? [])
    .filter((e) => selected.has(entityKey(e)))
    .map(({ playerId, type, vnum }) => ({
      ownerPlayerId: playerId,
      type,
      vnum,
    }));

  return {
    allSelected,
    entities,
    error,
    grouped,
    isError,
    isLoading,
    isSenior: user?.isSenior ?? false,
    ownerFilter,
    publishMutation,
    selected,
    selectedEntities,
    setOwnerFilter: _setOwnerFilter,
    someSelected,
    toggleAll,
    toggleOne,
  };
}

function dashboardStorageKey(playerId: number): string {
  return `buildertools-publish-dashboard-owner-filter-${playerId}`;
}
