import {
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { DashboardEntity } from "@/shared/schemas/publish.ts";

import { invalidateEntityCaches } from "@/lib/invalidate-entity-caches.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { okResponseSchema } from "@/shared/schemas/common.ts";
import { toastError } from "@/shared/toast.ts";

const URL_SEGMENT: Record<DashboardEntity["type"], string> = {
  mob: "mobs",
  "mob-response": "mob-responses",
  object: "objects",
  room: "rooms",
};

export function useSingleEntityPublish({
  diffQuery,
  ownerPlayerId,
  type,
  vnum,
}: {
  diffQuery: UseQueryResult;
  // Phase D populates this. Phase C always passes undefined.
  ownerPlayerId?: number | undefined;
  type: DashboardEntity["type"];
  vnum: number;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const ownerQuery =
        ownerPlayerId === undefined ? "" : `?owner=${ownerPlayerId}`;
      return apiFetch(
        `/api/publish/${URL_SEGMENT[type]}/${vnum}${ownerQuery}`,
        okResponseSchema,
        { method: "POST" },
      );
    },
    onError: async (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Publish failed",
      );
      await diffQuery.refetch();
    },
    onSuccess: async () => {
      toast.success(`Published ${type} ${vnum} to production`);
      await invalidateEntityCaches(queryClient, {
        kind: "single",
        type,
        vnum,
      });
      await diffQuery.refetch();
    },
  });
}
