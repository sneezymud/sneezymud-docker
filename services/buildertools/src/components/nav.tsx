import { Link, useNavigate } from "@tanstack/react-router";

import { useAuthStore } from "@/state/auth.ts";

export function Nav() {
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    void (async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      clearUser();
      await navigate({ to: "/login" });
    })();
  };

  return (
    <nav className="flex h-screen w-56 flex-col border-r border-zinc-700/50 bg-zinc-900 p-4">
      <div className="mb-6">
        <h1 className="text-sm font-semibold text-zinc-400">SneezyMUD</h1>
        <p className="text-xs text-zinc-500">Builder Tools</p>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <NavLink to="/rooms">Rooms</NavLink>
        <NavLink to="/mobs">Mobs</NavLink>
        <NavLink to="/objects">Objects</NavLink>
        <NavLink to="/zones">Zones</NavLink>
      </div>

      <div className="border-t border-zinc-700/50 pt-4">
        <p className="mb-2 text-xs text-zinc-500">{user.playerName}</p>
        <button
          className="text-xs text-zinc-400 hover:text-zinc-200"
          onClick={handleLogout}
          type="button"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}

function NavLink({ children, to }: { children: React.ReactNode; to: string }) {
  return (
    <Link
      activeProps={{ className: "bg-zinc-800 text-zinc-100" }}
      className="rounded px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
      to={to}
    >
      {children}
    </Link>
  );
}
