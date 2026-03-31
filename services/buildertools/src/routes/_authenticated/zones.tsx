import { createFileRoute } from "@tanstack/react-router";

import { ZonesPage } from "@/components/zones-page";

export const Route = createFileRoute("/_authenticated/zones")({
  component: () => <ZonesPage />,
});
