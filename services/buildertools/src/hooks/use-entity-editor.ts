import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { FieldError } from "@/shared/types/entity-form.ts";

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
  /** When true, keyboard save shortcut is suppressed. */
  readOnly?: boolean | undefined;
  /** Performs the save API call. Return saved entity for cache update, or null to skip. */
  saveFn: () => Promise<null | T>;
  /** Pre-save validation. Return field errors to block save, or null to proceed. */
  validate?: () => FieldError[] | null;
}

export function useEntityEditor<T>({
  allKey,
  data,
  deletePath,
  detailKey,
  dirty,
  listPath,
  onReset,
  readOnly = false,
  saveFn,
  validate,
}: UseEntityEditorOptions<T>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Side effects: useSyncDirty keeps the tab title's dirty indicator in sync,
  // useConcurrentEditWarning toasts if the server data changes while editing.
  useSyncDirty(dirty);
  useConcurrentEditWarning(data, dirty);

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
  });

  // Manual beforeunload — only register when there are actual unsaved changes.
  // useBlocker's enableBeforeUnload always registers the handler regardless of
  // shouldBlockFn, causing false "unsaved changes" prompts on clean pages.
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [dirty]);

  const saveMutation = useMutation({
    mutationFn: saveFn,
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async (saved) => {
      toast.success("Saved");
      setFieldErrors({});
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
      if (detailKey) queryClient.removeQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: allKey });
      if (listPath) {
        await navigate({ to: listPath });
      }
    },
  });

  function applyValidation(): boolean {
    if (!validate) return true;
    const errors = validate();
    if (!errors) {
      setFieldErrors({});
      return true;
    }
    const errorMap: Record<string, string> = {};
    for (const { field, message } of errors) {
      errorMap[field] = message;
    }
    setFieldErrors(errorMap);
    toastError("Required fields cannot be empty");

    const firstError = errors[0];
    const el = firstError
      ? document.querySelector<HTMLElement>(`#field-${firstError.field}`)
      : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return false;
  }

  function handleSave() {
    if (!applyValidation()) return;
    saveMutation.mutate();
  }

  async function handleSaveAndProceed() {
    if (!applyValidation()) return;
    try {
      await saveMutation.mutateAsync();
      proceed?.();
    } catch {
      // onError handler in the mutation already shows the toast
    }
  }

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      return Object.fromEntries(
        Object.entries(prev).filter(([k]) => k !== key),
      );
    });
  }

  useKeyboardSave(handleSave, dirty && !saveMutation.isPending && !readOnly);

  return {
    clearFieldError,
    deletePending: deleteMutation.isPending,
    fieldErrors,
    handleDelete: () => {
      deleteMutation.mutate();
    },
    handleSave,
    handleSaveAndProceed,
    saving: saveMutation.isPending,
    unsavedNavProceed: proceed,
    unsavedNavReset: reset,
    unsavedNavStatus: status,
  };
}
