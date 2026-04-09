import { Hono } from "hono";

import { type AuthEnv, requireAuth } from "../auth/middleware.ts";
import { resolvePlayerNames } from "../queries/player-names.ts";

export const playerRoutes = new Hono<AuthEnv>();
playerRoutes.use(requireAuth);

playerRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id < 1) {
    return c.json({ error: "Invalid player id" }, 400);
  }
  const names = await resolvePlayerNames([id]);
  const name = names.get(id);
  if (name === undefined) {
    return c.json({ error: "Player not found" }, 404);
  }
  return c.json({ id, name });
});
