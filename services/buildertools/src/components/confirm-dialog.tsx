import { useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isDanger = variant === "danger";

  return (
    <dialog
      className="rounded-lg border border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-xl backdrop:bg-black/50"
      onClose={onCancel}
      ref={dialogRef}
    >
      <div className="w-80 p-5">
        {title ? <h3 className="mb-2 text-sm font-semibold">{title}</h3> : null}
        <p className="mb-4 text-sm text-zinc-400">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              isDanger
                ? "bg-red-800 text-red-100 hover:bg-red-700"
                : "bg-zinc-600 text-zinc-100 hover:bg-zinc-500"
            }`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
