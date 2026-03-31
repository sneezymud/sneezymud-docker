import type { QueryClient } from "@tanstack/react-query";

import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => (
      <>
        <Outlet />
        <Toaster />
        {/* {import.meta.env.DEV && <TanStackRouterDevtools />} */}
      </>
    ),
  errorComponent: ({ error }) => (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4">
      <Alert
        className="max-w-lg"
        variant="destructive"
      >
        <AlertTitle>Something went wrong</AlertTitle>

        <AlertDescription>
          <pre className="overflow-auto text-xs whitespace-pre-wrap">
            {error instanceof Error ? error.message : "Unknown error"}
          </pre>
        </AlertDescription>
      </Alert>

      <Button
        onClick={() => {
          globalThis.location.reload();
        }}
        variant="secondary"
      >
        Reload
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="bg-background text-muted-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <p>404 Not Found</p>

      <Button
        asChild
        variant="link"
      >
        <Link to="/">&larr; Back to Builder Tools</Link>
      </Button>
    </div>
  ),
});
