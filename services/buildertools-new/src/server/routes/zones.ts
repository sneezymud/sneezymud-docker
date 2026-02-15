import { Hono } from "hono";

import { type AuthEnv, requireAuth } from "../auth/middleware.ts";
import { listZones } from "../queries/zones.ts";

export const zoneRoutes = new Hono<AuthEnv>();

zoneRoutes.use(requireAuth);

zoneRoutes.get("/", async (c) => {
  const zones = await listZones();
  return c.json(zones);
});
