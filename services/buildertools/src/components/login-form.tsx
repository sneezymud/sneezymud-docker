import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { sessionUserSchema } from "@/shared/schemas/auth.ts";
import { useAuthStore } from "@/state/auth.ts";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const {
    error,
    isPending,
    mutate: login,
  } = useMutation({
    mutationFn: (vars: { password: string; username: string }) =>
      apiFetch("/api/auth/login", sessionUserSchema, {
        body: JSON.stringify(vars),
        method: "POST",
      }),
    onSuccess: (user) => {
      setUser(user);
      return navigate({ to: "/" });
    },
  });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        login({ password, username });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>

        <Input
          autoComplete="username"
          id="username"
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          ref={usernameRef}
          required
          type="text"
          value={username}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>

        <Input
          autoComplete="current-password"
          id="password"
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          required
          type="password"
          value={password}
        />
      </div>

      {error && (
        <Alert
          aria-live="assertive"
          variant="destructive"
        >
          <AlertDescription>
            {error instanceof ApiResponseError
              ? error.message
              : "An unexpected error occurred"}
          </AlertDescription>
        </Alert>
      )}

      <Button
        className="h-11 w-full"
        disabled={isPending}
        size="lg"
        type="submit"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Log in"
        )}
      </Button>

      <p className="text-muted-foreground bg-muted/40 border-muted-foreground/20 rounded border-l-2 px-3 py-2 text-xs">
        *Account must contain a character with builder permissions.
      </p>
    </form>
  );
}
