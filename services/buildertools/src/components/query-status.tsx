import { Link } from "@tanstack/react-router";

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
      skeleton ?? <p className="text-sm text-zinc-400">Loading {label}...</p>
    );
  }

  if (isError) {
    const message =
      error instanceof ApiResponseError
        ? `${error.status}: ${error.message}`
        : "An unexpected error occurred";

    return (
      <div className="space-y-3">
        <div className="rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          <p>{message}</p>
        </div>
        {backTo ? (
          <Link
            className="inline-block text-sm text-zinc-400 hover:text-zinc-200"
            to={backTo}
          >
            &larr; {backLabel ?? "Go back"}
          </Link>
        ) : null}
      </div>
    );
  }

  return null;
}
