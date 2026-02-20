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
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">SneezyMUD Builder Tools</CardTitle>
          <CardDescription>Log in with your game account</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
