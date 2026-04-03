import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { apiErrorSchema } from "@/shared/schemas/common.ts";
import {
  type BulkPublishRequest,
  type DashboardEntity,
  dashboardResponseSchema,
} from "@/shared/schemas/publish.ts";
import { toastError } from "@/shared/toast.ts";

const DASHBOARD_KEY = ["publish-dashboard"] as const;

export function usePublishDashboard() {
  const [ownerFilter, setOwnerFilterRaw] = useState<"all" | "mine">("mine");
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
    mutationFn: async (items: BulkPublishRequest["entities"]) => {
      const res = await fetch("/api/publish/bulk", {
        body: JSON.stringify({ entities: items }),
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "POST",
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        let message = "Publish failed";
        try {
          const parsed = apiErrorSchema.safeParse(await res.json());
          if (parsed.success) message = parsed.data.error;
        } catch {
          // non-JSON response
        }
        throw new ApiResponseError(res.status, message);
      }
    },
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
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
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

  const setOwnerFilter = (v: "all" | "mine") => {
    setOwnerFilterRaw(v);
    setSelected(new Set());
  };

  const selectedEntities = (entities ?? [])
    .filter((e) => selected.has(entityKey(e)))
    .map((e) => ({
      type: e.type as BulkPublishRequest["entities"][number]["type"],
      vnum: e.vnum,
    }));

  return {
    allSelected,
    entities,
    error,
    grouped,
    isError,
    isLoading,
    ownerFilter,
    publishMutation,
    selected,
    selectedEntities,
    setOwnerFilter,
    someSelected,
    toggleAll,
    toggleOne,
  };
}

function entityKey(e: DashboardEntity): string {
  return `${e.type}:${e.vnum}`;
}
