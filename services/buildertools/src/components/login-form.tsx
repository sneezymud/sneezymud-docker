import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

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
      {error ? (
        <div className="rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div>
        <label
          className="mb-1 block text-sm text-zinc-400"
          htmlFor="username"
        >
          Username
        </label>
        <input
          autoComplete="username"
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          id="username"
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          required
          type="text"
          value={username}
        />
      </div>

      <div>
        <label
          className="mb-1 block text-sm text-zinc-400"
          htmlFor="password"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
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
        className="w-full rounded bg-zinc-700 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-600 disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
