import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityList } from "@/components/entity-list.tsx";
import { OwnerToggle } from "@/components/owner-toggle.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useEntityListMutations } from "@/hooks/use-entity-list-mutations.ts";
import { useOwnerFilter } from "@/hooks/use-owner-filter.ts";
import { entityKeys } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { SECTOR_TYPES } from "@/shared/enums/index.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
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
  const isSenior = user?.isSenior ?? false;
  const blocks = user?.blocks ?? [];
  const playerId = user?.playerId ?? 0;
  const navigate = useNavigate();
  const [ownerFilter, setOwnerFilter] = useOwnerFilter({
    isSenior,
    playerId,
    type: "room",
  });

  const {
    data: rooms,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/rooms?owner=${ownerFilter}`, roomListSchema),
    queryKey: entityKeys.list("room", ownerFilter),
  });

  const [confirmVnums, setConfirmVnums] = useState<number[]>([]);

  const { createMutation, deleteMutation } = useEntityListMutations({
    apiPath: "/api/rooms",
    createSchema: roomSchema,
    entityLabel: "room",
    listQueryKey: entityKeys.all("room"),
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
    const item: {
      metadata?: string;
      name: string;
      owner?: string;
      playerId: number;
      vnum: number;
    } = {
      name: r.name,
      playerId: r.player_id ?? playerId,
      vnum: r.vnum,
    };
    const sectorLabel = SECTOR_TYPES.find((s) => s.value === r.sector)?.label;
    if (sectorLabel !== undefined) item.metadata = sectorLabel;
    if (r.owner !== undefined) item.owner = r.owner;
    return item;
  });

  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter((e) => e.vnum >= from && e.vnum <= to)
      : entities;

  const canEdit =
    ownerFilter !== "all" &&
    resolvePermissions(user?.powers ?? [], isSenior).canEditRooms;

  return (
    <>
      <EntityList
        allowAnyVnum={isSenior}
        banner={
          <>
            {isSenior ? (
              <div className="mb-4">
                <OwnerToggle
                  onChange={setOwnerFilter}
                  value={ownerFilter}
                />
              </div>
            ) : null}

            {from !== undefined && to !== undefined ? (
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
            ) : null}
          </>
        }
        basePath="/rooms"
        canEdit={canEdit}
        createPending={createMutation.isPending}
        currentUserId={playerId}
        deletePending={deleteMutation.isPending}
        entities={filtered}
        label="Rooms"
        ownerFilter={ownerFilter}
        {...(canEdit && {
          onCreateVnum: (vnum: number) => {
            createMutation.mutate(vnum);
          },
          onDeleteSelected: setConfirmVnums,
          vnumBlocks: blocks,
        })}
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
