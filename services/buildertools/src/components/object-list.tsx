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
import { ITEM_TYPES } from "@/shared/enums/index.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { objListSchema, objSchema } from "@/shared/schemas/obj.ts";
import { useAuthStore } from "@/state/auth.ts";

export function ObjectList({
  from,
  to,
}: {
  from: number | undefined;
  to: number | undefined;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isSenior = user?.isSenior ?? false;
  const blocks = user?.blocks ?? [];
  const playerId = user?.playerId ?? 0;
  const [ownerFilter, setOwnerFilter] = useOwnerFilter({
    isSenior,
    playerId,
    type: "object",
  });

  const {
    data: objects,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/objects?owner=${ownerFilter}`, objListSchema),
    queryKey: entityKeys.list("object", ownerFilter),
  });

  const [confirmVnums, setConfirmVnums] = useState<number[]>([]);

  const { createMutation, deleteMutation } = useEntityListMutations({
    apiPath: "/api/objects",
    createSchema: objSchema,
    entityLabel: "object",
    listQueryKey: entityKeys.all("object"),
    onCreated: async (vnum) => {
      await navigate({ to: `/objects/${vnum}` });
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

  const entities = objects.map((o) => {
    const item: {
      metadata?: string;
      name: string;
      owner?: string;
      playerId: number;
      secondary: string;
      vnum: number;
    } = {
      name: o.short_desc || o.name,
      playerId: o.player_id ?? playerId,
      secondary: o.name,
      vnum: o.vnum,
    };
    const typeLabel = ITEM_TYPES.find((t) => t.value === o.type)?.label;
    if (typeLabel !== undefined) item.metadata = typeLabel;
    if (o.owner !== undefined) item.owner = o.owner;
    return item;
  });

  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter((e) => e.vnum >= from && e.vnum <= to)
      : entities;

  const canEdit =
    ownerFilter !== "all" &&
    resolvePermissions(user?.powers ?? [], isSenior).canEditObjects;

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
                      void navigate({ search: {}, to: "/objects" });
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
        basePath="/objects"
        canEdit={canEdit}
        createPending={createMutation.isPending}
        currentUserId={playerId}
        deletePending={deleteMutation.isPending}
        entities={filtered}
        label="Objects"
        ownerFilter={ownerFilter}
        secondaryLabel="Keywords"
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
    </>
  );
}
