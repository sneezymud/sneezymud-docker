import { createFileRoute } from "@tanstack/react-router";

import { PublishDashboard } from "@/components/publish-dashboard";

export const Route = createFileRoute("/_authenticated/publish")({
  component: () => <PublishDashboard />,
});
