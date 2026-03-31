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
import { ITEM_TYPES } from "@/shared/enums/index.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import { objectKeys } from "@/shared/query-keys.ts";
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
  const expandedAccess = hasPower(user?.powers ?? [], POWER.LOW);
  const blocks = user?.blocks ?? [];

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

  const { createMutation, deleteMutation } = useEntityListMutations({
    apiPath: "/api/objects",
    createSchema: objSchema,
    entityLabel: "object",
    listQueryKey: objectKeys.all,
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
      secondary: string;
      vnum: number;
    } = {
      name: o.short_desc || o.name,
      secondary: o.name,
      vnum: o.vnum,
    };
    const typeLabel = ITEM_TYPES.find((t) => t.value === o.type)?.label;
    if (typeLabel !== undefined) item.metadata = typeLabel;
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
                    void navigate({ search: {}, to: "/objects" });
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
    </>
  );
}
