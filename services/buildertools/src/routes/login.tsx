import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginForm } from "@/components/login-form.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.17_0.01_50)_0%,oklch(0.13_0.005_250)_70%)] p-4">
      <Card className="border-t-primary/40 w-full max-w-sm border-t-2 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            <span className="font-mono">SneezyMUD</span> Builder Tools
          </CardTitle>

          <CardDescription>Log in with your game account</CardDescription>
        </CardHeader>

        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
