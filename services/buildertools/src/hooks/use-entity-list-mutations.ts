import type { z } from "zod";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { bulkDeleteResponseSchema } from "@/shared/schemas/common.ts";
import { toastError } from "@/shared/toast.ts";

export function useEntityListMutations({
  apiPath,
  createSchema,
  entityLabel,
  listQueryKey,
  onCreated,
}: {
  apiPath: string;
  createSchema: z.ZodType<{ vnum: number }>;
  entityLabel: string;
  listQueryKey: readonly unknown[];
  onCreated: (vnum: number) => Promise<void>;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (vnums: number[]) =>
      apiFetch(`${apiPath}/bulk`, bulkDeleteResponseSchema, {
        body: JSON.stringify({ vnums }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError
          ? err.message
          : `Failed to delete ${entityLabel}s`,
      );
    },
    onSuccess: async (_data, vnums) => {
      toast.success(
        `Deleted ${vnums.length} ${entityLabel}${vnums.length === 1 ? "" : "s"}`,
      );
      await queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch(apiPath, createSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError
          ? err.message
          : `Failed to create ${entityLabel}`,
      );
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: listQueryKey });
      await onCreated(data.vnum);
    },
  });

  return { createMutation, deleteMutation };
}
