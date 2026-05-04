import { Link } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";

import type { DashboardEntity } from "@/shared/schemas/publish.ts";

import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { OwnerToggle } from "@/components/owner-toggle.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  entityKey,
  usePublishDashboard,
} from "@/hooks/use-publish-dashboard.ts";
import { canonicalOwner } from "@/lib/entity-keys.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { useAuthStore } from "@/state/auth.ts";

const TYPE_LABELS = {
  mob: "Mobs",
  "mob-response": "Mob Responses",
  object: "Objects",
  room: "Rooms",
} as const satisfies Record<DashboardEntity["type"], string>;

const ENTITY_ROUTES = {
  mob: "/mobs/$vnum",
  "mob-response": "/mobs/$vnum/responses",
  object: "/objects/$vnum",
  room: "/rooms/$vnum",
} as const;

const GROUPS = [
  "room",
  "mob",
  "object",
  "mob-response",
] as const satisfies ReadonlyArray<DashboardEntity["type"]>;

export function PublishDashboard() {
  const user = useAuthStore((s) => s.user);
  const permissions = resolvePermissions(
    user?.powers ?? [],
    user?.isSenior ?? false,
  );

  if (!permissions.canPublish) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        <p>You do not have permission to publish.</p>
      </div>
    );
  }

  return <DashboardContent />;
}

function EntityGroup({
  currentUserId,
  entities,
  onToggle,
  selected,
  showOwner,
  type,
}: {
  currentUserId: number;
  entities: DashboardEntity[];
  onToggle: (key: string) => void;
  selected: Set<string>;
  showOwner: boolean;
  type: DashboardEntity["type"];
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-foreground text-sm font-medium">
        {TYPE_LABELS[type]}
      </h2>

      <div className="divide-border divide-y rounded-md border">
        {entities.map((entity) => {
          const key = entityKey(entity);
          const cOwner = canonicalOwner(entity.playerId, currentUserId);
          const searchProp =
            cOwner === undefined ? {} : { search: { owner: cOwner } };
          return (
            <div
              aria-label={`${entity.type} ${entity.vnum}`}
              className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2 transition-colors"
              key={key}
              role="row"
            >
              <Checkbox
                checked={selected.has(key)}
                onCheckedChange={() => {
                  onToggle(key);
                }}
              />

              <Link
                className="flex min-w-0 flex-1 items-center gap-2"
                params={{ vnum: String(entity.vnum) }}
                to={ENTITY_ROUTES[entity.type]}
                {...searchProp}
              >
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {entity.vnum}
                </span>

                <span className="truncate text-sm">{entity.name}</span>

                <Badge
                  className="ml-auto shrink-0"
                  variant={entity.status === "new" ? "success" : "secondary"}
                >
                  {entity.status === "new" ? "New" : "Modified"}
                </Badge>

                {showOwner && (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {entity.owner}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardContent() {
  const currentUserId = useAuthStore((s) => s.user?.playerId ?? 0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    allSelected,
    entities,
    error,
    grouped,
    isError,
    isLoading,
    isSenior,
    ownerFilter,
    publishMutation,
    selected,
    selectedEntities,
    setOwnerFilter,
    someSelected,
    toggleAll,
    toggleOne,
  } = usePublishDashboard();

  if (isLoading || isError) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="publish dashboard"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-foreground text-xl font-semibold">
          Publish to Production
        </h1>

        {isSenior && (
          <OwnerToggle
            onChange={setOwnerFilter}
            value={ownerFilter}
          />
        )}
      </div>

      {entities.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          All entities are in sync with production.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={toggleAll}
            />

            <span className="text-muted-foreground text-sm">
              {selected.size > 0
                ? `${selected.size} selected`
                : `${entities.length} ${entities.length === 1 ? "entity differs" : "entities differ"} from production`}
            </span>

            {selected.size > 0 && (
              <Button
                disabled={publishMutation.isPending}
                onClick={() => {
                  setConfirmOpen(true);
                }}
                size="sm"
              >
                {publishMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Publish Selected ({selectedEntities.length})
              </Button>
            )}
          </div>

          {GROUPS.map((type) => {
            const group = grouped.get(type);
            if (!group?.length) return null;
            return (
              <EntityGroup
                currentUserId={currentUserId}
                entities={group}
                key={type}
                onToggle={toggleOne}
                selected={selected}
                showOwner={ownerFilter === "all"}
                type={type}
              />
            );
          })}
        </>
      )}

      <ConfirmDialog
        confirmLabel="Publish"
        disabled={publishMutation.isPending}
        message={`This will publish ${selected.size} ${selected.size === 1 ? "entity" : "entities"} to production. This cannot be undone.`}
        onCancel={() => {
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          publishMutation.mutate(selectedEntities);
          setConfirmOpen(false);
        }}
        open={confirmOpen}
        title="Publish to Production"
        variant="danger"
      />
    </div>
  );
}
