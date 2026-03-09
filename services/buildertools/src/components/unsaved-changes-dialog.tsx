import { ConfirmDialog } from "@/components/confirm-dialog.tsx";

export function UnsavedChangesDialog({
  unsavedNavProceed,
  unsavedNavReset,
  unsavedNavStatus,
}: {
  unsavedNavProceed: (() => void) | undefined;
  unsavedNavReset: (() => void) | undefined;
  unsavedNavStatus: "blocked" | "idle";
}) {
  return (
    <ConfirmDialog
      confirmLabel="Discard changes"
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
