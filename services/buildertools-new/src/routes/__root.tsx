import type { QueryClient } from "@tanstack/react-query";

import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootLayout,
  notFoundComponent: () => <div>404 Not Found</div>,
});

function RootLayout() {
  return (
    <>
      <div className="bg-background text-foreground min-h-screen">
        <Outlet />
      </div>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  );
}
