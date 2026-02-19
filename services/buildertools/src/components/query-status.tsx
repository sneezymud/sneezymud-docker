import { Link } from "@tanstack/react-router";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ApiResponseError } from "@/shared/api-client.ts";

interface QueryStatusProps {
  backLabel?: string;
  backTo?: string;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  label: string;
  skeleton?: React.ReactNode;
}

export function QueryStatus({
  backLabel,
  backTo,
  error,
  isError,
  isLoading,
  label,
  skeleton,
}: QueryStatusProps) {
  if (isLoading) {
    return (
      skeleton ?? (
        <p className="text-muted-foreground text-sm">Loading {label}...</p>
      )
    );
  }

  if (isError) {
    const message =
      error instanceof ApiResponseError
        ? `${error.status}: ${error.message}`
        : "An unexpected error occurred";

    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        {backTo ? (
          <Button
            asChild
            variant="link"
          >
            <Link to={backTo}>&larr; {backLabel ?? "Go back"}</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}
