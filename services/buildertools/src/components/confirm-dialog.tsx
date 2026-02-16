import { useEffect, useId, useRef } from "react";

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
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

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
      aria-describedby={descId}
      aria-labelledby={title ? titleId : undefined}
      className="bg-transparent p-0"
      onClose={onCancel}
      ref={dialogRef}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop dismiss zone around the dialog content */}
      <div
        className="p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onCancel();
          }
        }}
      >
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-xl">
          {title ? (
            <h3
              className="mb-2 text-sm font-semibold"
              id={titleId}
            >
              {title}
            </h3>
          ) : null}
          <p
            className="mb-4 text-sm text-zinc-400"
            id={descId}
          >
            {message}
          </p>
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
        </div>
      </div>
    </dialog>
  );
}
