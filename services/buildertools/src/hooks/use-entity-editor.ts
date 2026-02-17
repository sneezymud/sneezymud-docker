import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { toastError } from "@/shared/toast.ts";

import { useConcurrentEditWarning } from "./use-concurrent-edit-warning.ts";
import { useKeyboardSave } from "./use-keyboard-save.ts";
import { useSyncDirty } from "./use-sync-dirty.ts";

interface UseEntityEditorOptions<T> {
  /** Key prefix for invalidation (e.g., roomKeys.all). Cascades to all sub-keys. */
  allKey: readonly unknown[];
  /** Loaded entity data — used for concurrent edit detection. */
  data: T | undefined;
  /** API path for DELETE (e.g., "/api/rooms/1234"). Omit to disable delete. */
  deletePath?: string | undefined;
  /** Key for setQueryData on save (e.g., roomKeys.detail(vnum)). Omit to skip cache update. */
  detailKey?: readonly unknown[] | undefined;
  /** Whether any edit state is non-null. */
  dirty: boolean;
  /** Route to navigate to after delete (e.g., "/rooms"). Required if deletePath is set. */
  listPath?: string | undefined;
  /** Called after successful save to reset all edit states. */
  onReset: () => void;
  /** Performs the save API call. Return saved entity for cache update, or null to skip. */
  saveFn: () => Promise<null | T>;
}

export function useEntityEditor<T>({
  allKey,
  data,
  deletePath,
  detailKey,
  dirty,
  listPath,
  onReset,
  saveFn,
}: UseEntityEditorOptions<T>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useSyncDirty(dirty);
  useConcurrentEditWarning(data, dirty);

  const { proceed, reset, status } = useBlocker({
    enableBeforeUnload: true,
    shouldBlockFn: () => dirty,
    withResolver: true,
  });

  const saveMutation = useMutation({
    mutationFn: saveFn,
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async (saved) => {
      toast.success("Saved");
      if (saved && detailKey) {
        queryClient.setQueryData(detailKey, saved);
      }
      onReset();
      await queryClient.invalidateQueries({ queryKey: allKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletePath) {
        return;
      }
      await apiFetch(deletePath, z.object({ ok: z.boolean() }), {
        method: "DELETE",
      });
    },
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to delete",
      );
    },
    onSuccess: async () => {
      if (!deletePath) {
        return;
      }
      toast.success("Deleted");
      void queryClient.invalidateQueries({ queryKey: allKey });
      if (listPath) {
        await navigate({ to: listPath });
      }
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  useKeyboardSave(handleSave, dirty && !saveMutation.isPending);

  return {
    blockerProceed: proceed,
    blockerReset: reset,
    blockerStatus: status,
    deletePending: deleteMutation.isPending,
    handleDelete: () => {
      deleteMutation.mutate();
    },
    handleSave,
    saving: saveMutation.isPending,
  };
}
