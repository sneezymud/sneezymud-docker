import { Loader2, Trash2 } from "lucide-react";
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
    <div className="bg-background/80 sticky top-0 z-10 mb-4 flex flex-col gap-2 py-2.5 backdrop-blur-md">
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

      <div className="flex items-center gap-2">
        <Button
          disabled={!dirty || saving}
          onClick={onSave}
          size="sm"
        >
          {saving ? <Loader2 className="animate-spin" /> : "Save"}
        </Button>

        {onReset !== undefined && dirty && (
          <Button
            className=""
            onClick={onReset}
            size="sm"
            variant="inline-warning"
          >
            Undo
          </Button>
        )}

        {onDelete !== undefined && (
          <>
            <Button
              aria-label="Delete"
              className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 ml-auto"
              disabled={deletePending}
              onClick={() => {
                setShowDeleteConfirm(true);
              }}
              size="icon-sm"
              variant="ghost"
            >
              {deletePending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
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
        )}
      </div>
    </div>
  );
}
