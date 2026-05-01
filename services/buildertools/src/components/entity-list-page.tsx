import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityList } from "@/components/entity-list.tsx";
import { OwnerToggle } from "@/components/owner-toggle.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  type ListEntityType,
  type RawItemFor,
  useEntityListPage,
} from "@/hooks/use-entity-list-page.ts";

interface EntityListItem {
  metadata?: string;
  name: string;
  owner?: string;
  playerId: number;
  secondary?: string;
  vnum: number;
}

export function EntityListPage<T extends ListEntityType>({
  from,
  to,
  toEntityItem,
  type,
}: {
  from: number | undefined;
  to: number | undefined;
  toEntityItem: (
    raw: RawItemFor<T>,
    fallbackPlayerId: number,
  ) => EntityListItem;
  type: T;
}) {
  const {
    blocks,
    canEdit,
    config,
    confirmVnums,
    createMutation,
    deleteMutation,
    isSenior,
    navigate,
    ownerFilter,
    playerId,
    query,
    setConfirmVnums,
    setOwnerFilter,
  } = useEntityListPage(type);

  if (query.isLoading || query.isError || !query.data) {
    return (
      <QueryStatus
        error={query.error}
        isError={query.isError}
        isLoading={query.isLoading}
        label={config.label.toLowerCase()}
      />
    );
  }

  const entities = query.data.map((item) => toEntityItem(item, playerId));
  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter(({ vnum }) => vnum >= from && vnum <= to)
      : entities;

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
                      void navigate({ search: {}, to: config.basePath });
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
        basePath={config.basePath}
        canEdit={canEdit}
        createPending={createMutation.isPending}
        currentUserId={playerId}
        deletePending={deleteMutation.isPending}
        entities={filtered}
        label={config.label}
        ownerFilter={ownerFilter}
        {...(config.secondaryLabel !== undefined && {
          secondaryLabel: config.secondaryLabel,
        })}
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
        message={`Delete ${confirmVnums.length} ${type}${confirmVnums.length === 1 ? "" : "s"}? This cannot be undone.`}
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
