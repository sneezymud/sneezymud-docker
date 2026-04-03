import type { UseQueryResult } from "@tanstack/react-query";

import { GitCompareArrows, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { DiffField } from "@/components/entity-diff.tsx";

import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityDiff } from "@/components/entity-diff.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { ApiResponseError } from "@/shared/api-client.ts";
import { apiErrorSchema } from "@/shared/schemas/common.ts";
import { toastError } from "@/shared/toast.ts";

interface DiffData {
  immortal: null | Record<string, unknown>;
  production: null | Record<string, unknown>;
}

export function DiffSheet({
  canPublish,
  description,
  diffQuery,
  entityType,
  fields,
  onOpenChange,
  open,
  vnum,
}: {
  canPublish: boolean;
  description: string;
  diffQuery: UseQueryResult<DiffData>;
  entityType: string;
  fields: DiffField[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  vnum: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/publish/${entityType}/${vnum}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
        method: "POST",
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        let message = "Publish failed";
        try {
          const parsed = apiErrorSchema.safeParse(await res.json());
          if (parsed.success) message = parsed.data.error;
        } catch {
          // non-JSON response
        }
        throw new ApiResponseError(res.status, message);
      }
      toast.success(`Published ${entityType} ${vnum} to production`);
      await diffQuery.refetch();
      setConfirmOpen(false);
    } catch (error) {
      toastError(
        error instanceof ApiResponseError ? error.message : "Publish failed",
      );
    } finally {
      setPublishing(false);
    }
  };

  const hasImmortalData = diffQuery.data?.immortal != null;

  return (
    <Sheet
      onOpenChange={onOpenChange}
      open={open}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Compare with Production</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {diffQuery.isFetching && (
            <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}

          {diffQuery.error && (
            <p className="text-destructive py-4 text-sm">
              Failed to load diff: {diffQuery.error.message}
            </p>
          )}

          {diffQuery.data && !diffQuery.isFetching && (
            <EntityDiff
              fields={fields}
              immortal={diffQuery.data.immortal}
              production={diffQuery.data.production}
            />
          )}

          {canPublish && hasImmortalData && !diffQuery.isFetching && (
            <div className="border-border mt-6 border-t pt-4">
              <Button
                disabled={publishing}
                onClick={() => {
                  setConfirmOpen(true);
                }}
                size="sm"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Publish to Production
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <ConfirmDialog
        confirmLabel="Publish"
        disabled={publishing}
        message={`This will overwrite the production version of this ${entityType} (vnum ${vnum}). This cannot be undone.`}
        onCancel={() => {
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          void handlePublish();
        }}
        open={confirmOpen}
        title="Publish to Production"
        variant="danger"
      />
    </Sheet>
  );
}

export function DiffButton({
  isFetching,
  onDiff,
}: {
  isFetching: boolean;
  onDiff: () => void;
}) {
  return (
    <Button
      className="ml-auto"
      disabled={isFetching}
      onClick={onDiff}
      size="sm"
      variant="outline"
    >
      {isFetching ? (
        <Loader2 className="animate-spin" />
      ) : (
        <GitCompareArrows className="h-4 w-4" />
      )}

      <span className="hidden sm:inline">Compare with Production</span>
      <span className="sm:hidden">Diff</span>
    </Button>
  );
}
