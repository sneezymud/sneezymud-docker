import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginForm } from "@/components/login-form.tsx";
import { SneezyLogo } from "@/components/sneezy-logo.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { useAuthStore } from "@/state/auth.ts";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: () => (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.22_0.015_240)_0%,oklch(0.15_0.01_250)_70%)] p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <SneezyLogo className="h-12 w-12" />
            <h1 className="font-brand text-3xl font-bold">SneezyMUD</h1>

            <p className="text-muted-foreground text-sm">
              Content creation tools for builders
            </p>
          </div>

          <Card className="border-t-primary/60 w-full border-t-2 px-8 py-10 shadow-lg shadow-black/25">
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    ),
});
