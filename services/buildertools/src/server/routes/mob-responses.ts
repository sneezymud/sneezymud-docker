import { Hono } from "hono";

import { POWER } from "@/shared/powers.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requirePower,
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
mobResponseRoutes.use(requirePower(POWER.MEDIT));

mobResponseRoutes.get("/:vnum", requireVnumAccess("mob"), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  if (!(await mobExists(vnum, scope))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  const response = await getMobResponse(vnum, scope);
  return c.json(response ?? { response: "", vnum });
});

mobResponseRoutes.put(
  "/:vnum",
  requireVnumAccess("mob"),
  jsonValidator(mobResponseSchema),
  async (c) => {
    const user = c.get("user");
    const scope = { owner: user.playerName };
    const vnum = Number(c.req.param("vnum"));

    if (!(await mobExists(vnum, scope))) {
      return c.json({ error: "Mob not found" }, 404);
    }

    const data = c.req.valid("json");
    await (data.response.trim() === ""
      ? deleteMobResponse(vnum, scope)
      : upsertMobResponse(vnum, data.response, scope));

    const updated = await getMobResponse(vnum, scope);
    return c.json(updated ?? { response: "", vnum });
  },
);
