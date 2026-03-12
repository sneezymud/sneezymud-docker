import { Loader2 } from "lucide-react";
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
    <div className="bg-background sticky top-0 z-10 mb-2 flex flex-col gap-1.5 py-1.5">
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

      <div className="grid grid-cols-3 items-center gap-x-2">
        <Button
          disabled={!dirty || saving}
          onClick={onSave}
          size="sm"
        >
          {saving ? <Loader2 className="animate-spin" /> : "Save"}
        </Button>

        {onReset !== undefined && (
          <Button
            disabled={!dirty}
            onClick={onReset}
            size="sm"
            variant="secondary"
          >
            Discard
          </Button>
        )}

        {onDelete !== undefined && (
          <>
            <Button
              disabled={deletePending}
              onClick={() => {
                setShowDeleteConfirm(true);
              }}
              size="sm"
              variant="destructive"
            >
              {deletePending ? <Loader2 className="animate-spin" /> : "Delete"}
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
