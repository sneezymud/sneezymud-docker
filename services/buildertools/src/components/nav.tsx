import { useQueryClient } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { Box, DoorOpen, Map, Upload, User } from "lucide-react";
import { useState } from "react";

import { SneezyLogo } from "@/components/sneezy-logo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { okResponseSchema } from "@/shared/schemas/common.ts";
import { useAuthStore } from "@/state/auth.ts";
import { useDirtyStore } from "@/state/dirty.ts";
import { useSidebarStore } from "@/state/sidebar.ts";

import { ConfirmDialog } from "./confirm-dialog.tsx";

interface NavProps {
  className?: string | undefined;
  onNavClick?: (() => void) | undefined;
}

export function Nav({ className, onNavClick }: NavProps) {
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) {
    return null;
  }

  const permissions = resolvePermissions(user.powers, user.isSenior);

  const doLogout = () => {
    (async () => {
      useAuthStore.getState().setLoggingOut(true);
      try {
        await apiFetch("/api/auth/logout", okResponseSchema, {
          method: "POST",
          signal: AbortSignal.timeout(5000),
        });
      } catch (error: unknown) {
        // Proceed with client-side logout even if the server call fails
        console.error("Logout API call failed:", error);
      }
      useSidebarStore.getState().close();
      queryClient.clear();
      clearUser();
      await navigate({ to: "/login" });
    })().catch((error: unknown) => {
      console.error("Logout failed:", error);
    });
  };

  const handleLogout = () => {
    if (useDirtyStore.getState().dirty) {
      setShowLogoutConfirm(true);
    } else {
      doLogout();
    }
  };

  return (
    <nav className={cn("border-border bg-card flex flex-col p-4", className)}>
      <div className="border-accent/20 mb-6 flex items-center gap-2 border-b pb-6">
        <SneezyLogo className="text-accent/70 h-6 w-6" />

        <div className="flex flex-col">
          <p className="text-foreground font-brand text-xl font-bold tracking-tight">
            SneezyMUD
          </p>

          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Builder Tools
          </p>

          {import.meta.env.DEV ? (
            <p className="text-muted-foreground/50 text-[10px]">dev</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <NavLink
          icon={<DoorOpen className="h-4 w-4 shrink-0" />}
          onClick={onNavClick}
          to="/rooms"
        >
          Rooms
        </NavLink>

        <NavLink
          icon={<User className="h-4 w-4 shrink-0" />}
          onClick={onNavClick}
          to="/mobs"
        >
          Mobs
        </NavLink>

        <NavLink
          icon={<Box className="h-4 w-4 shrink-0" />}
          onClick={onNavClick}
          to="/objects"
        >
          Objects
        </NavLink>

        <NavLink
          icon={<Map className="h-4 w-4 shrink-0" />}
          onClick={onNavClick}
          to="/zones"
        >
          Zones
        </NavLink>

        {permissions.canPublish && (
          <NavLink
            icon={<Upload className="h-4 w-4 shrink-0" />}
            onClick={onNavClick}
            to="/publish"
          >
            Publish
          </NavLink>
        )}
      </div>

      <div className="border-border mt-auto flex justify-between border-t pt-3">
        <div className="flex flex-col text-xs">
          <span className="grid grid-cols-2 gap-x-2">
            <span className="text-muted-foreground text-right">Character:</span>
            <span className="text-accent-foreground">{user.playerName}</span>
          </span>

          <span className="grid grid-cols-2 gap-x-2">
            <span className="text-muted-foreground text-right">Account:</span>
            <span className="text-accent-foreground">{user.username}</span>
          </span>
        </div>

        <Button
          className="text-xs"
          onClick={handleLogout}
          size="inline"
          variant="inline"
        >
          Log out
        </Button>
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
  const matchRoute = useMatchRoute();
  const isActive = Boolean(matchRoute({ fuzzy: true, to }));

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring/50 flex items-center gap-2 rounded-r border-l-2 px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-[3px]",
        isActive
          ? "bg-accent/20 text-accent border-l-accent font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-transparent",
      )}
      onClick={onClick}
      to={to}
    >
      {icon}
      {children}
    </Link>
  );
}
