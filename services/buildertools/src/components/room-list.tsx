import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityList } from "@/components/entity-list.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useEntityListMutations } from "@/hooks/use-entity-list-mutations.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { SECTOR_TYPES } from "@/shared/enums/index.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import { roomKeys } from "@/shared/query-keys.ts";
import { roomListSchema, roomSchema } from "@/shared/schemas/room.ts";
import { useAuthStore } from "@/state/auth.ts";

export function RoomList({
  from,
  to,
}: {
  from: number | undefined;
  to: number | undefined;
}) {
  const user = useAuthStore((s) => s.user);
  const powers = user?.powers ?? [];
  const expandedAccess =
    hasPower(powers, POWER.LOW) && hasPower(powers, POWER.NO_LIMITS);
  const blocks = user?.blocks ?? [];
  const navigate = useNavigate();

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

  const { createMutation, deleteMutation } = useEntityListMutations({
    apiPath: "/api/rooms",
    createSchema: roomSchema,
    entityLabel: "room",
    listQueryKey: roomKeys.all,
    onCreated: async (vnum) => {
      await navigate({ to: `/rooms/${vnum}` });
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

  const entities = rooms.map((r) => {
    const item: { metadata?: string; name: string; vnum: number } = {
      name: r.name,
      vnum: r.vnum,
    };
    const sectorLabel = SECTOR_TYPES.find((s) => s.value === r.sector)?.label;
    if (sectorLabel !== undefined) item.metadata = sectorLabel;
    return item;
  });

  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter((e) => e.vnum >= from && e.vnum <= to)
      : entities;

  return (
    <>
      <EntityList
        allowAnyVnum={expandedAccess}
        banner={
          from !== undefined && to !== undefined ? (
            <Alert className="mb-4">
              <AlertDescription className="flex items-center gap-2">
                Filtered to zone range {from}&ndash;{to}
                <Button
                  onClick={() => {
                    void navigate({ search: {}, to: "/rooms" });
                  }}
                  size="xs"
                  variant="inline"
                >
                  Clear filter
                </Button>
              </AlertDescription>
            </Alert>
          ) : undefined
        }
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
    </>
  );
}
