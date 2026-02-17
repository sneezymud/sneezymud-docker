import * as Dialog from "@radix-ui/react-dialog";

interface ConfirmDialogProps {
  confirmLabel?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title?: string;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  confirmLabel = "Confirm",
  message,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "default",
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <Dialog.Root
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="confirm-overlay fixed inset-0 z-50" />
        <Dialog.Content className="confirm-content fixed top-1/2 left-1/2 z-50 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-xl">
          <Dialog.Title
            className={title ? "mb-2 text-sm font-semibold" : "sr-only"}
          >
            {title ?? "Confirmation"}
          </Dialog.Title>
          <Dialog.Description className="mb-4 text-sm text-zinc-400">
            {message}
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <button
              className="focus-visible:ring-accent rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`focus-visible:ring-accent rounded px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 ${
                isDanger
                  ? "bg-red-700 text-red-100 hover:bg-red-600"
                  : "bg-zinc-600 text-zinc-100 hover:bg-zinc-500"
              }`}
              onClick={onConfirm}
              type="button"
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
