import { useState } from "react";

import type { BreadcrumbEntry } from "@/components/breadcrumbs.tsx";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

import { Breadcrumbs } from "./breadcrumbs.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";

export function EntityHeader({
  before,
  breadcrumbs,
  children,
  deleteMessage,
  deletePending,
  dirty,
  onDelete,
  onReset,
  onSave,
  saving,
}: {
  before?: React.ReactNode;
  breadcrumbs: BreadcrumbEntry[];
  children?: React.ReactNode;
  deleteMessage?: string;
  deletePending?: boolean;
  dirty: boolean;
  onDelete?: () => void;
  onReset?: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="mb-4 flex items-center gap-3">
      {before}
      <Breadcrumbs items={breadcrumbs} />
      {children}

      <Button
        disabled={!dirty || saving}
        onClick={onSave}
        size="sm"
      >
        {saving ? "Saving..." : "Save"}
      </Button>

      <span
        aria-live="polite"
        className="contents"
      >
        {dirty ? (
          <Badge
            className="animate-in fade-in slide-in-from-top-1 gap-1.5 text-amber-400 duration-150"
            variant="outline"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            Unsaved changes
            {onReset ? (
              <Button
                className="ml-1"
                onClick={onReset}
                size="xs"
                variant="link"
              >
                Discard
              </Button>
            ) : null}
          </Badge>
        ) : null}
      </span>

      {onDelete ? (
        <>
          <Button
            className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive ml-auto"
            disabled={deletePending}
            onClick={() => {
              setShowDeleteConfirm(true);
            }}
            size="sm"
            variant="outline"
          >
            {deletePending ? "Deleting..." : "Delete"}
          </Button>
          <ConfirmDialog
            confirmLabel="Yes, delete"
            message={deleteMessage ?? "Are you sure you want to delete this?"}
            onCancel={() => {
              setShowDeleteConfirm(false);
            }}
            onConfirm={() => {
              if (deletePending) return;
              setShowDeleteConfirm(false);
              onDelete();
            }}
            open={showDeleteConfirm}
            title="Confirm Delete"
            variant="danger"
          />
        </>
      ) : null}
    </div>
  );
}
