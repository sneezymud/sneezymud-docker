import { Link } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";

import type { DashboardEntity } from "@/shared/schemas/publish.ts";

import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { usePublishDashboard } from "@/hooks/use-publish-dashboard.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { useAuthStore } from "@/state/auth.ts";

const TYPE_LABELS: Record<string, string> = {
  mob: "Mobs",
  object: "Objects",
  room: "Rooms",
};

const ENTITY_ROUTES = {
  mob: "/mobs/$vnum",
  object: "/objects/$vnum",
  room: "/rooms/$vnum",
} as const;

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

  return <DashboardContent isSenior={permissions.isSenior} />;
}

function OwnerToggle({
  ownerFilter,
  setOwnerFilter,
}: {
  ownerFilter: "all" | "mine";
  setOwnerFilter: (v: "all" | "mine") => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => {
          setOwnerFilter("mine");
        }}
        size="sm"
        variant={ownerFilter === "mine" ? "default" : "outline"}
      >
        My entities
      </Button>

      <Button
        onClick={() => {
          setOwnerFilter("all");
        }}
        size="sm"
        variant={ownerFilter === "all" ? "default" : "outline"}
      >
        All entities
      </Button>
    </div>
  );
}

function entityKey(e: DashboardEntity): string {
  return `${e.type}:${e.vnum}`;
}

function EntityGroup({
  entities,
  onToggle,
  selected,
  showOwner,
  type,
}: {
  entities: DashboardEntity[];
  onToggle: (key: string) => void;
  selected: Set<string>;
  showOwner: boolean;
  type: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-foreground text-sm font-medium">
        {TYPE_LABELS[type]}
      </h2>

      <div className="divide-border divide-y rounded-md border">
        {entities.map((entity) => {
          const key = entityKey(entity);
          return (
            <div
              className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2 transition-colors"
              key={key}
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

function DashboardContent({ isSenior }: { isSenior: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    allSelected,
    entities,
    error,
    grouped,
    isError,
    isLoading,
    ownerFilter,
    publishMutation,
    selected,
    selectedEntities,
    setOwnerFilter,
    someSelected,
    toggleAll,
    toggleOne,
  } = usePublishDashboard();

  if (isLoading || isError || !entities) {
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
            ownerFilter={ownerFilter}
            setOwnerFilter={setOwnerFilter}
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
                Publish Selected ({selected.size})
              </Button>
            )}
          </div>

          {(["room", "mob", "object"] as const).map((type) => {
            const group = grouped.get(type);
            if (!group?.length) return null;
            return (
              <EntityGroup
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
