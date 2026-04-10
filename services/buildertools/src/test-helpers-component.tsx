// Shared utilities for component integration tests.

import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";

export interface FetchCall {
  body: unknown;
  method: string;
  url: string;
}

interface FetchHandler {
  body: unknown;
  method?: string;
  status?: number;
  url: string;
}

let fetchLog: FetchCall[] = [];

export function getFetchLog(): FetchCall[] {
  return fetchLog;
}

/**
 * Render a component wrapped in the providers needed for most components
 * to function (QueryClientProvider + RouterProvider). Creates fresh
 * instances per call to avoid shared state between tests.
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createTestRouter(queryClient, ui);

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/**
 * Create a minimal TanStack Router for tests. Components use useBlocker(),
 * useNavigate(), etc. which require a RouterProvider in the tree.
 * The root route renders an Outlet which displays children.
 */
function createTestRouter(queryClient: QueryClient, element: ReactElement) {
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: Outlet,
  });
  const indexRoute = createRoute({
    component: () => element,
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const routeTree = rootRoute.addChildren([indexRoute]);
  return createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree,
  });
}

const originalFetch = globalThis.fetch;

/**
 * Mock globalThis.fetch with predetermined responses. Matches by URL
 * substring - first matching handler wins. Unmatched URLs throw.
 */
export function mockFetch(handlers: FetchHandler[]) {
  fetchLog = [];
  globalThis.fetch = Object.assign(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = init?.method ?? "GET";
      let body: unknown = undefined;
      if (init?.body !== undefined && init.body !== null) {
        try {
          body = JSON.parse(typeof init.body === "string" ? init.body : "");
        } catch {
          body = init.body;
        }
      }
      fetchLog.push({ body, method, url });
      const handler = handlers.find(
        (h) => url.includes(h.url) && (!h.method || h.method === method),
      );
      if (!handler) {
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      }
      return Promise.resolve(
        Response.json(handler.body, {
          status: handler.status ?? 200,
        }),
      );
    },
    { preconnect: originalFetch.preconnect },
  );
}

/** Restore the original fetch after tests. */
export function resetFetchMock() {
  globalThis.fetch = originalFetch;
  fetchLog = [];
}
