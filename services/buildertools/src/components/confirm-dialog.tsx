import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";

interface ConfirmDialogProps {
  additionalActions?: React.ReactNode;
  confirmLabel?: string;
  disabled?: boolean | undefined;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title?: string;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  additionalActions,
  confirmLabel = "Confirm",
  disabled,
  message,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
      open={open}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle className={title ? "" : "sr-only"}>
            {title ?? "Confirmation"}
          </AlertDialogTitle>

          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {additionalActions ? (
            <div className="col-span-full">{additionalActions}</div>
          ) : null}

          <AlertDialogCancel
            disabled={disabled}
            onClick={onCancel}
          >
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={disabled}
            onClick={onConfirm}
            variant={variant === "danger" ? "destructive" : "default"}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
