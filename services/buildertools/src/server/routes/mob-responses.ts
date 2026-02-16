import { Hono } from "hono";

import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";

import { type AuthEnv, requireAuth } from "../auth/middleware.ts";
import {
  deleteMobResponse,
  getMobResponse,
  upsertMobResponse,
} from "../queries/mob-responses.ts";
import { mobExists } from "../queries/mobs.ts";
import { isVnumInBlocks } from "../queries/vnum-access.ts";

export const mobResponseRoutes = new Hono<AuthEnv>();

mobResponseRoutes.use(requireAuth);

mobResponseRoutes.get("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await mobExists(vnum))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  const response = await getMobResponse(vnum);
  return c.json(response ?? { response: "", vnum });
});

mobResponseRoutes.put("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await mobExists(vnum))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  const body: unknown = await c.req.json();
  const parsed = mobResponseSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          message: i.message,
          path: i.path.map(String),
        })),
      },
      400,
    );
  }

  await (parsed.data.response.trim() === ""
    ? deleteMobResponse(vnum)
    : upsertMobResponse(vnum, parsed.data.response, user.playerName));

  const updated = await getMobResponse(vnum);
  return c.json(updated ?? { response: "", vnum });
});
