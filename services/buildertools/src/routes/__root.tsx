import type { QueryClient } from "@tanstack/react-query";

import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootLayout,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-400">
      <p className="text-lg text-red-400">Something went wrong</p>
      <pre className="max-w-lg overflow-auto rounded border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-500">
        {error instanceof Error ? error.message : "Unknown error"}
      </pre>
      <button
        className="rounded bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600"
        onClick={() => {
          globalThis.location.reload();
        }}
        type="button"
      >
        Reload
      </button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      404 Not Found
    </div>
  ),
});

function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  );
}
