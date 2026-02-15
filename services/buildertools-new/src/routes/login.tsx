import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginForm } from "@/components/login-form.tsx";
import { useAuthStore } from "@/state/auth.ts";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-100">
            SneezyMUD Builder Tools
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Log in with your game account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
