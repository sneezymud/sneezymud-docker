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
import { RACE_TYPES } from "@/shared/enums/index.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { mobListSchema, mobSchema } from "@/shared/schemas/mob.ts";
import { useAuthStore } from "@/state/auth.ts";

export function MobList({
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
    type: "mob",
  });

  const {
    data: mobs,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/mobs?owner=${ownerFilter}`, mobListSchema),
    queryKey: entityKeys.list("mob", ownerFilter),
  });

  const [confirmVnums, setConfirmVnums] = useState<number[]>([]);

  const { createMutation, deleteMutation } = useEntityListMutations({
    apiPath: "/api/mobs",
    createSchema: mobSchema,
    entityLabel: "mob",
    listQueryKey: entityKeys.all("mob"),
    onCreated: async (vnum) => {
      await navigate({ to: `/mobs/${vnum}` });
    },
  });

  if (isLoading || isError || !mobs) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="mobs"
      />
    );
  }

  const entities = mobs.map((m) => {
    const item: {
      metadata: string;
      name: string;
      owner?: string;
      playerId: number;
      secondary: string;
      vnum: number;
    } = {
      metadata: `Lvl ${m.level} / ${RACE_TYPES.find((r) => r.value === m.race)?.label ?? "Unknown"}`,
      name: m.short_desc || m.name,
      playerId: m.player_id ?? playerId,
      secondary: m.name,
      vnum: m.vnum,
    };
    if (m.owner !== undefined) item.owner = m.owner;
    return item;
  });

  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter((e) => e.vnum >= from && e.vnum <= to)
      : entities;

  const canEdit =
    ownerFilter !== "all" &&
    resolvePermissions(user?.powers ?? [], isSenior).canEditMobs;

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
                      void navigate({ search: {}, to: "/mobs" });
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
        basePath="/mobs"
        canEdit={canEdit}
        createPending={createMutation.isPending}
        currentUserId={playerId}
        deletePending={deleteMutation.isPending}
        entities={filtered}
        label="Mobs"
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
        message={`Delete ${confirmVnums.length} mob${confirmVnums.length === 1 ? "" : "s"}? This cannot be undone.`}
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
