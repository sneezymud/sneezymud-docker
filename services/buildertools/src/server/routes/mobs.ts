import { Hono } from "hono";

import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { mobCreateSchema, mobInputSchema } from "@/shared/schemas/mob.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
} from "../auth/middleware.ts";
import { isDuplicateKeyError } from "../db.ts";
import {
  createMob,
  deleteMob,
  deleteMobs,
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
  const scope = { owner: user.playerName };
  const mobs = await listMobs(user.blocks, scope);
  return c.json(mobs);
});

mobRoutes.post("/", jsonValidator(mobCreateSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const data = c.req.valid("json");

  if (!isVnumInBlocks(data.vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await mobExists(data.vnum, scope)) {
    return c.json({ error: "Mob already exists" }, 409);
  }

  try {
    await createMob(data.vnum, scope);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return c.json({ error: "Mob already exists" }, 409);
    }
    throw error;
  }
  const mob = await getMob(data.vnum, scope);
  return c.json(mob, 201);
});

mobRoutes.get("/:vnum", requireVnumAccess, async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  const mob = await getMob(vnum, scope);
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
    const scope = { owner: user.playerName };
    const vnum = Number(c.req.param("vnum"));

    if (!(await mobExists(vnum, scope))) {
      return c.json({ error: "Mob not found" }, 404);
    }

    const data = c.req.valid("json");
    await updateMob(vnum, data, scope);
    const updated = await getMob(vnum, scope);
    return c.json(updated);
  },
);

mobRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const { vnums } = c.req.valid("json");

  const unauthorized = vnums.filter((v) => !isVnumInBlocks(v, user.blocks));
  if (unauthorized.length > 0) {
    return c.json(
      { error: `Vnums outside assigned blocks: ${unauthorized.join(", ")}` },
      403,
    );
  }

  const deleted = await deleteMobs(vnums, scope);
  return c.json({ deleted, ok: true });
});

mobRoutes.delete("/:vnum", requireVnumAccess, async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  if (!(await mobExists(vnum, scope))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  await deleteMob(vnum, scope);
  return c.json({ ok: true });
});
