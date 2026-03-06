import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Box, DoorOpen, Map, User } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import { useDirtyStore } from "@/state/dirty.ts";

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

  const doLogout = () => {
    void (async () => {
      try {
        await fetch("/api/auth/logout", {
          headers: { "X-Requested-With": "XMLHttpRequest" },
          method: "POST",
          signal: AbortSignal.timeout(5000),
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

  return (
    <nav
      className={cn("border-border bg-card flex w-56 flex-col p-4", className)}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-foreground font-mono text-lg font-bold tracking-tight">
            SneezyMUD
          </p>

          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Builder Tools
          </p>
        </div>

        <div className="text-right">
          <p className="text-muted-foreground text-xs">{user.playerName}</p>

          {user.username === user.playerName ? null : (
            <p className="text-muted-foreground text-xs">({user.username})</p>
          )}

          <Button
            className="h-auto p-0 text-xs"
            onClick={handleLogout}
            variant="link"
          >
            Log out
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {hasPower(user.powers, POWER.REDIT) ? (
          <NavLink
            icon={<DoorOpen className="h-4 w-4 shrink-0" />}
            onClick={onNavClick}
            to="/rooms"
          >
            Rooms
          </NavLink>
        ) : null}

        {hasPower(user.powers, POWER.MEDIT) ? (
          <NavLink
            icon={<User className="h-4 w-4 shrink-0" />}
            onClick={onNavClick}
            to="/mobs"
          >
            Mobs
          </NavLink>
        ) : null}

        {hasPower(user.powers, POWER.OEDIT) ? (
          <NavLink
            icon={<Box className="h-4 w-4 shrink-0" />}
            onClick={onNavClick}
            to="/objects"
          >
            Objects
          </NavLink>
        ) : null}

        <NavLink
          icon={<Map className="h-4 w-4 shrink-0" />}
          onClick={onNavClick}
          to="/zones"
        >
          Zones
        </NavLink>
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
        className: "bg-muted text-foreground",
      }}
      className="focus-visible:ring-accent text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-offset-background flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
      onClick={onClick}
      to={to}
    >
      {icon}
      {children}
    </Link>
  );
}
