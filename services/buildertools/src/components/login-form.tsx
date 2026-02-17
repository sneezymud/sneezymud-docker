import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/input.tsx";
import { Label } from "@/components/label.tsx";
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
      className="w-full max-w-sm space-y-4"
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

      <button
        className="focus-visible:ring-accent w-full rounded bg-zinc-700 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
              />
            </svg>
            Logging in...
          </span>
        ) : (
          "Log in"
        )}
      </button>

      {error ? (
        <div
          aria-live="assertive"
          className="rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : null}

      <p className="text-center text-xs text-zinc-400">
        Need an account? Contact a MUD admin.
      </p>
    </form>
  );
}
