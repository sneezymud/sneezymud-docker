import { toast } from "sonner";

/** Show an error toast with a longer display duration. */
export function toastError(message: string): void {
  toast.error(message, { duration: 8000 });
}
