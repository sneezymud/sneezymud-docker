import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAuthStore } from "@/state/auth.ts";
import { useDirtyStore } from "@/state/dirty.ts";
import { useSidebarStore } from "@/state/sidebar.ts";

import { ConfirmDialog } from "./confirm-dialog.tsx";
import { Z_MOBILE_SIDEBAR } from "./styles.ts";

export function Nav() {
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const sidebarOpen = useSidebarStore((s) => s.open);
  const closeSidebar = useSidebarStore((s) => s.close);

  if (!user) {
    return null;
  }

  const doLogout = () => {
    void (async () => {
      try {
        await fetch("/api/auth/logout", {
          headers: { "X-Requested-With": "XMLHttpRequest" },
          method: "POST",
        });
      } catch {
        // Proceed with client-side logout even if the server call fails
      }
      queryClient.clear();
      clearUser();
      await navigate({ to: "/login" });
    })();
  };

  const handleLogout = () => {
    if (useDirtyStore.getState().dirty) {
      setShowLogoutConfirm(true);
    } else {
      doLogout();
    }
  };

  const handleNavClick = () => {
    closeSidebar();
  };

  return (
    <nav
      className={`fixed inset-y-0 left-0 ${Z_MOBILE_SIDEBAR} flex w-56 transform flex-col border-r border-zinc-700/50 bg-zinc-900 p-4 transition-transform md:static md:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-6">
        <p className="text-base font-semibold text-zinc-400">SneezyMUD</p>
        <p className="text-sm text-zinc-400">Builder Tools</p>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <NavLink
          icon={<DoorIcon />}
          onClick={handleNavClick}
          to="/rooms"
        >
          Rooms
        </NavLink>
        <NavLink
          icon={<PersonIcon />}
          onClick={handleNavClick}
          to="/mobs"
        >
          Mobs
        </NavLink>
        <NavLink
          icon={<BoxIcon />}
          onClick={handleNavClick}
          to="/objects"
        >
          Objects
        </NavLink>
        <NavLink
          icon={<MapIcon />}
          onClick={handleNavClick}
          to="/zones"
        >
          Zones
        </NavLink>
      </div>

      <div className="border-t border-zinc-700/50 pt-4">
        <p className="mb-0.5 text-xs text-zinc-400">{user.playerName}</p>
        {user.username === user.playerName ? (
          <div className="mb-2" />
        ) : (
          <p className="mb-2 text-xs text-zinc-400">({user.username})</p>
        )}
        <button
          className="focus-visible:ring-accent text-xs text-zinc-400 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          onClick={handleLogout}
          type="button"
        >
          Log out
        </button>
      </div>

      <ConfirmDialog
        confirmLabel="Log out"
        message="You have unsaved changes that will be lost if you log out."
        onCancel={() => {
          setShowLogoutConfirm(false);
        }}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          doLogout();
        }}
        open={showLogoutConfirm}
        title="Unsaved Changes"
        variant="danger"
      />
    </nav>
  );
}

function NavLink({
  children,
  icon,
  onClick,
  to,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode | undefined;
  onClick?: (() => void) | undefined;
  to: string;
}) {
  return (
    <Link
      activeProps={{
        "aria-current": "page" as const,
        className: "bg-zinc-800 text-zinc-100",
      }}
      className="focus-visible:ring-accent flex items-center gap-2 rounded px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
      onClick={onClick}
      to={to}
    >
      {icon}
      {children}
    </Link>
  );
}

const iconClass = "h-4 w-4 shrink-0";

function DoorIcon() {
  return (
    <svg
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path
        d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 12h.01"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 11a4 4 0 100-8 4 4 0 000 8zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path
        d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path
        d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
