import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";

import "./index.css";
import { routeTree } from "./routeTree.gen";
import { ApiResponseError } from "./shared/api-client.ts";
import { useAuthStore } from "./state/auth.ts";

function handleAuthError(error: Error): void {
  if (error instanceof ApiResponseError && error.status === 401) {
    useAuthStore.getState().clearUser();
    toast.warning("Your session has expired. Please log in again.");
    void router.navigate({ to: "/login" });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: handleAuthError,
    },
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiResponseError && error.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      handleAuthError(error);
      if (!(error instanceof ApiResponseError && error.status === 401)) {
        toast.error("Connection issue — data may be outdated");
      }
    },
  }),
});

const router = createRouter({
  context: { queryClient },
  defaultPendingMinMs: 0,
  defaultPendingMs: 0,
  // Keep previous route visible during navigation until new route is ready
  defaultPreload: "intent",
  defaultViewTransition: true,
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const container = document.querySelector("#root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/* {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />} */}
      </QueryClientProvider>
    </StrictMode>,
  );
}
