import { createFileRoute, redirect } from "@tanstack/react-router";

// Root redirects to rooms — the _authenticated layout handles auth gating
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/rooms" });
  },
});
