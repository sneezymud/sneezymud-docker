import { useState } from "react";

import type { BreadcrumbEntry } from "@/components/breadcrumbs.tsx";

import { Button } from "@/components/ui/button.tsx";

import { Breadcrumbs } from "./breadcrumbs.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { MobileMenuButton } from "./mobile-menu-button.tsx";

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

  // Last breadcrumb is the current entity name
  const entityName = breadcrumbs.at(-1)?.label ?? "";

  return (
    <div className="bg-background border-border/50 sticky top-0 z-10 mb-4 flex flex-col gap-1.5 border-b py-1.5 sm:gap-3 sm:py-2">
      {/* Mobile: back arrow + entity name + hamburger */}

      <div className="flex items-center gap-3 sm:hidden">
        {before}

        <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
          {entityName}
        </span>

        <MobileMenuButton />
      </div>

      {/* Desktop: full breadcrumbs */}

      <div className="hidden items-center gap-3 sm:flex">
        {before}
        <Breadcrumbs items={breadcrumbs} />
        {children}
      </div>

      <div className="flex items-center">
        <Button
          className="text-primary/80 hover:text-primary hover:cursor-pointer hover:no-underline"
          disabled={!dirty || saving}
          onClick={onSave}
          size="sm"
          variant="link"
        >
          {saving ? "Saving..." : "Save"}
        </Button>

        {dirty && onReset ? (
          <Button
            className="text-muted-foreground hover:text-foreground hover:cursor-pointer hover:no-underline"
            onClick={onReset}
            size="sm"
            variant="link"
          >
            Discard changes
          </Button>
        ) : null}

        {onDelete ? (
          <>
            <Button
              className="text-destructive/80 hover:text-destructive ml-auto hover:cursor-pointer hover:no-underline"
              disabled={deletePending}
              onClick={() => {
                setShowDeleteConfirm(true);
              }}
              size="sm"
              variant="link"
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
    </div>
  );
}
