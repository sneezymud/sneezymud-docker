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
import { roomKeys } from "@/shared/query-keys.ts";
import { bulkDeleteResponseSchema } from "@/shared/schemas/common.ts";
import { roomListSchema, roomSchema } from "@/shared/schemas/room.ts";
import { toastError } from "@/shared/toast.ts";
import { useAuthStore } from "@/state/auth.ts";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/rooms/")({
  component: RoomListPage,
  validateSearch: (search) => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : emptySearch;
  },
});

function RoomListPage() {
  const user = useAuthStore((s) => s.user);
  const powers = user?.powers ?? [];
  const expandedAccess =
    hasPower(powers, POWER.LOW) && hasPower(powers, POWER.NO_LIMITS);
  const blocks = expandedAccess ? [] : (user?.blocks ?? []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { from, to } = Route.useSearch();

  const {
    data: rooms,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/rooms", roomListSchema),
    queryKey: roomKeys.all,
  });

  const [confirmVnums, setConfirmVnums] = useState<number[]>([]);

  const deleteMutation = useMutation({
    mutationFn: (vnums: number[]) =>
      apiFetch("/api/rooms/bulk", bulkDeleteResponseSchema, {
        body: JSON.stringify({ vnums }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError
          ? err.message
          : "Failed to delete rooms",
      );
    },
    onSuccess: async (_data, vnums) => {
      toast.success(
        `Deleted ${vnums.length} room${vnums.length === 1 ? "" : "s"}`,
      );
      await queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch("/api/rooms", roomSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to create room",
      );
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: roomKeys.all });
      await navigate({ to: `/rooms/${data.vnum}` });
    },
  });

  if (isLoading || isError || !rooms) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="rooms"
      />
    );
  }

  const filtered =
    from !== undefined && to !== undefined
      ? rooms.filter((r) => r.vnum >= from && r.vnum <= to)
      : rooms;

  return (
    <div>
      {from !== undefined && to !== undefined ? (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center gap-2">
            Filtered to zone range {from}&ndash;{to}
            <Button
              onClick={() => {
                void navigate({ search: {}, to: "/rooms" });
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
        basePath="/rooms"
        createPending={createMutation.isPending}
        deletePending={deleteMutation.isPending}
        entities={filtered}
        label="Rooms"
        onCreateVnum={(vnum) => {
          createMutation.mutate(vnum);
        }}
        onDeleteSelected={setConfirmVnums}
        vnumBlocks={blocks}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        message={`Delete ${confirmVnums.length} room${confirmVnums.length === 1 ? "" : "s"}? This cannot be undone.`}
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
