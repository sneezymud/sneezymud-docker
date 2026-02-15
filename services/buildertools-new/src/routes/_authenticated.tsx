import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { Nav } from "@/components/nav.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { sessionUserSchema } from "@/shared/schemas/auth.ts";
import { useAuthStore } from "@/state/auth.ts";

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
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Nav />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
