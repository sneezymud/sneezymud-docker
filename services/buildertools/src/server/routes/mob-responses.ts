import { Hono } from "hono";

import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
} from "../auth/middleware.ts";
import {
  deleteMobResponse,
  getMobResponse,
  upsertMobResponse,
} from "../queries/mob-responses.ts";
import { mobExists } from "../queries/mobs.ts";

export const mobResponseRoutes = new Hono<AuthEnv>();

mobResponseRoutes.use(requireAuth);

mobResponseRoutes.get("/:vnum", requireVnumAccess, async (c) => {
  const vnum = Number(c.req.param("vnum"));

  if (!(await mobExists(vnum))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  const response = await getMobResponse(vnum);
  return c.json(response ?? { response: "", vnum });
});

mobResponseRoutes.put(
  "/:vnum",
  requireVnumAccess,
  jsonValidator(mobResponseSchema),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));

    if (!(await mobExists(vnum))) {
      return c.json({ error: "Mob not found" }, 404);
    }

    const data = c.req.valid("json");
    await (data.response.trim() === ""
      ? deleteMobResponse(vnum)
      : upsertMobResponse(vnum, data.response, user.playerName));

    const updated = await getMobResponse(vnum);
    return c.json(updated ?? { response: "", vnum });
  },
);
