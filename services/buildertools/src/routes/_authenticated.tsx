import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { Nav } from "@/components/nav.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { sessionUserSchema } from "@/shared/schemas/auth.ts";
import { useAuthStore } from "@/state/auth.ts";
import { useSidebarStore } from "@/state/sidebar.ts";

import { saveLastSection } from "./index.tsx";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { setUser, user } = useAuthStore.getState();

    if (user) {
      return;
    }

    // No user in memory — check if we have a valid session cookie
    try {
      const sessionUser = await apiFetch("/api/auth/me", sessionUserSchema);
      setUser(sessionUser);
    } catch {
      // Retry once after a brief delay (handles transient network failures)
      try {
        await new Promise((r) => setTimeout(r, 1000));
        const sessionUser = await apiFetch("/api/auth/me", sessionUserSchema);
        setUser(sessionUser);
      } catch {
        throw redirect({ to: "/login" });
      }
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const sidebarOpen = useSidebarStore((s) => s.open);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const closeSidebar = useSidebarStore((s) => s.close);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    saveLastSection(pathname);
  }, [pathname]);

  // Dismiss mobile sidebar on Escape key
  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSidebar();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <a
        className="focus:bg-accent sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        href="#main-content"
      >
        Skip to content
      </a>

      {sidebarOpen ? (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      ) : null}

      <Nav />

      <main
        className="min-w-0 flex-1 p-6"
        id="main-content"
      >
        <div className="mb-4 md:hidden">
          <button
            aria-label="Open navigation"
            className="focus-visible:ring-accent rounded border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
            onClick={toggleSidebar}
            type="button"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="mx-auto max-w-screen-2xl transition-opacity duration-100">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
