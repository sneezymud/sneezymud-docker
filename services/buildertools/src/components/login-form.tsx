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
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    void (async () => {
      try {
        const user = await apiFetch("/api/auth/login", sessionUserSchema, {
          body: JSON.stringify({ password, username }),
          method: "POST",
        });
        setUser(user);
        await navigate({ to: "/" });
      } catch (error_) {
        if (error_ instanceof ApiResponseError) {
          setError(error_.message);
        } else {
          setError("An unexpected error occurred");
        }
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit}
    >
      <div>
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

      <div>
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

      {error ? (
        <Alert
          aria-live="assertive"
          variant="destructive"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        className="w-full"
        disabled={loading}
        type="submit"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Log in"
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Need an account? Contact a MUD admin.
      </p>
    </form>
  );
}
