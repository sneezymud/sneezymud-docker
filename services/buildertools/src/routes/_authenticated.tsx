import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect } from "react";

import { Nav } from "@/components/nav.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet.tsx";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
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
    } catch (error) {
      // 401 = genuine session expiry — redirect immediately
      if (error instanceof ApiResponseError && error.status === 401) {
        throw redirect({ to: "/login" });
      }
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
  notFoundComponent: () => (
    <div className="text-muted-foreground flex flex-col items-center gap-4 py-16">
      <p>Page not found</p>
      <Button
        asChild
        variant="link"
      >
        <Link to="/rooms">&larr; Back to rooms</Link>
      </Button>
    </div>
  ),
});

function AuthenticatedLayout() {
  const sidebarOpen = useSidebarStore((s) => s.open);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const closeSidebar = useSidebarStore((s) => s.close);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    saveLastSection(pathname);
  }, [pathname]);

  return (
    <div className="bg-background flex min-h-screen">
      <a
        className="focus:bg-accent sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        href="#main-content"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <Nav className="sticky top-0 hidden h-screen overflow-y-auto border-r lg:flex" />

      {/* Mobile sidebar */}
      <Sheet
        modal={false}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeSidebar();
        }}
        open={sidebarOpen}
      >
        <SheetContent
          className="w-56 p-0"
          showCloseButton={false}
          side="left"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Nav
            className="flex h-full border-r-0"
            onNavClick={closeSidebar}
          />
        </SheetContent>
      </Sheet>

      <main
        className="min-w-0 flex-1 p-6"
        id="main-content"
      >
        <div className="mb-4 lg:hidden">
          <Button
            aria-label="Open navigation"
            onClick={toggleSidebar}
            size="icon"
            variant="outline"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="3xl:max-w-none mx-auto max-w-screen-2xl transition-opacity duration-100">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
