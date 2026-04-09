import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";

import { ConfirmDialog } from "./confirm-dialog.tsx";

export function UnsavedChangesDialog({
  onSaveAndProceed,
  readOnly = false,
  saving,
  unsavedNavProceed,
  unsavedNavReset,
  unsavedNavStatus,
}: {
  onSaveAndProceed?: (() => Promise<void>) | undefined;
  readOnly?: boolean | undefined;
  saving?: boolean | undefined;
  unsavedNavProceed: (() => void) | undefined;
  unsavedNavReset: (() => void) | undefined;
  unsavedNavStatus: "blocked" | "idle";
}) {
  return (
    <ConfirmDialog
      additionalActions={
        onSaveAndProceed && !readOnly ? (
          <Button
            disabled={saving}
            onClick={() => {
              void onSaveAndProceed();
            }}
          >
            {saving ? <Loader2 className="animate-spin" /> : "Save & continue"}
          </Button>
        ) : undefined
      }
      confirmLabel="Discard changes"
      disabled={saving}
      message="You have unsaved changes that will be lost."
      onCancel={() => {
        unsavedNavReset?.();
      }}
      onConfirm={() => {
        unsavedNavProceed?.();
      }}
      open={unsavedNavStatus === "blocked"}
      title="Unsaved Changes"
      variant="danger"
    />
  );
}
