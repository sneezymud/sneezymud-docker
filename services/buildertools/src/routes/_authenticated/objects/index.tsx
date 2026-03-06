import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityList } from "@/components/entity-list.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import { objectKeys } from "@/shared/query-keys.ts";
import { bulkDeleteResponseSchema } from "@/shared/schemas/common.ts";
import { objListSchema, objSchema } from "@/shared/schemas/obj.ts";
import { toastError } from "@/shared/toast.ts";
import { useAuthStore } from "@/state/auth.ts";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/objects/")({
  component: ObjectListPage,
  validateSearch: (search) => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : emptySearch;
  },
});

function ObjectListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const powers = user?.powers ?? [];
  const expandedAccess = hasPower(powers, POWER.LOW);
  const blocks = expandedAccess ? [] : (user?.blocks ?? []);
  const { from, to } = Route.useSearch();

  const {
    data: objects,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/objects", objListSchema),
    queryKey: objectKeys.all,
  });

  const [confirmVnums, setConfirmVnums] = useState<number[]>([]);

  const deleteMutation = useMutation({
    mutationFn: (vnums: number[]) =>
      apiFetch("/api/objects/bulk", bulkDeleteResponseSchema, {
        body: JSON.stringify({ vnums }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError
          ? err.message
          : "Failed to delete objects",
      );
    },
    onSuccess: async (_data, vnums) => {
      toast.success(
        `Deleted ${vnums.length} object${vnums.length === 1 ? "" : "s"}`,
      );
      await queryClient.invalidateQueries({ queryKey: objectKeys.all });
    },
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch("/api/objects", objSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError
          ? err.message
          : "Failed to create object",
      );
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: objectKeys.all });
      await navigate({ to: `/objects/${data.vnum}` });
    },
  });

  if (isLoading || isError || !objects) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="objects"
      />
    );
  }

  const entities = objects.map((o) => ({
    name: o.short_desc || o.name,
    secondary: o.name,
    vnum: o.vnum,
  }));

  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter((e) => e.vnum >= from && e.vnum <= to)
      : entities;

  return (
    <div>
      {from !== undefined && to !== undefined ? (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center gap-2">
            Filtered to zone range {from}&ndash;{to}
            <Button
              onClick={() => {
                void navigate({ search: {}, to: "/objects" });
              }}
              size="xs"
              variant="link"
            >
              Clear filter
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <EntityList
        basePath="/objects"
        createPending={createMutation.isPending}
        deletePending={deleteMutation.isPending}
        entities={filtered}
        label="Objects"
        onCreateVnum={(vnum) => {
          createMutation.mutate(vnum);
        }}
        onDeleteSelected={setConfirmVnums}
        secondaryLabel="Keywords"
        vnumBlocks={blocks}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        message={`Delete ${confirmVnums.length} object${confirmVnums.length === 1 ? "" : "s"}? This cannot be undone.`}
        onCancel={() => {
          setConfirmVnums([]);
        }}
        onConfirm={() => {
          deleteMutation.mutate(confirmVnums);
          setConfirmVnums([]);
        }}
        open={confirmVnums.length > 0}
        title="Confirm Bulk Delete"
        variant="danger"
      />
    </div>
  );
}
