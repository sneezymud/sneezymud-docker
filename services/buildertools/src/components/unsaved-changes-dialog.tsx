import { ConfirmDialog } from "@/components/confirm-dialog.tsx";

export function UnsavedChangesDialog({
  blockerProceed,
  blockerReset,
  blockerStatus,
}: {
  blockerProceed: (() => void) | undefined;
  blockerReset: (() => void) | undefined;
  blockerStatus: "blocked" | "idle";
}) {
  return (
    <ConfirmDialog
      confirmLabel="Discard changes"
      message="You have unsaved changes that will be lost."
      onCancel={() => {
        blockerReset?.();
      }}
      onConfirm={() => {
        blockerProceed?.();
      }}
      open={blockerStatus === "blocked"}
      title="Unsaved Changes"
      variant="danger"
    />
  );
}
