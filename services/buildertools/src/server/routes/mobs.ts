import { Hono } from "hono";

import { mobCreateSchema, mobInputSchema } from "@/shared/schemas/mob.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
} from "../auth/middleware.ts";
import {
  createMob,
  deleteMob,
  getMob,
  listMobs,
  mobExists,
  updateMob,
} from "../queries/mobs.ts";
import { isVnumInBlocks } from "../queries/vnum-access.ts";

export const mobRoutes = new Hono<AuthEnv>();

mobRoutes.use(requireAuth);

mobRoutes.get("/", async (c) => {
  const user = c.get("user");
  const mobs = await listMobs(user.blocks);
  return c.json(mobs);
});

mobRoutes.post("/", jsonValidator(mobCreateSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  if (!isVnumInBlocks(data.vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await mobExists(data.vnum)) {
    return c.json({ error: "Mob already exists" }, 409);
  }

  await createMob(data.vnum, user.playerName);
  const mob = await getMob(data.vnum);
  return c.json(mob, 201);
});

mobRoutes.get("/:vnum", requireVnumAccess, async (c) => {
  const vnum = Number(c.req.param("vnum"));

  const mob = await getMob(vnum);
  if (!mob) {
    return c.json({ error: "Mob not found" }, 404);
  }

  return c.json(mob);
});

mobRoutes.put(
  "/:vnum",
  requireVnumAccess,
  jsonValidator(mobInputSchema),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));

    if (!(await mobExists(vnum))) {
      return c.json({ error: "Mob not found" }, 404);
    }

    const data = c.req.valid("json");
    await updateMob(vnum, data, user.playerName);
    const updated = await getMob(vnum);
    return c.json(updated);
  },
);

mobRoutes.delete("/:vnum", requireVnumAccess, async (c) => {
  const vnum = Number(c.req.param("vnum"));

  if (!(await mobExists(vnum))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  await deleteMob(vnum);
  return c.json({ ok: true });
});
