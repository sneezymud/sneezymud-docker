import { Hono } from "hono";

import { hasPower, POWER } from "@/shared/powers.ts";
import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { mobCreateSchema, mobInputSchema } from "@/shared/schemas/mob.ts";
import { isUnassignableMobSpecProc } from "@/shared/spec-proc-access.ts";

import {
  type AuthEnv,
  canAccessVnum,
  hasExpandedAccess,
  jsonValidator,
  requireAuth,
  requirePower,
  requireVnumAccess,
} from "../auth/middleware.ts";
import { isDuplicateKeyError } from "../db.ts";
import { getOtherBuildersBlocks } from "../queries/auth.ts";
import {
  createMob,
  deleteMob,
  deleteMobs,
  getMob,
  listMobs,
  mobExists,
  updateMob,
} from "../queries/mobs.ts";

export const mobRoutes = new Hono<AuthEnv>();

mobRoutes.use(requireAuth);
mobRoutes.use(requirePower(POWER.MEDIT));

mobRoutes.get("/", async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const blocks = hasExpandedAccess(user.powers, "mob") ? null : user.blocks;
  const mobs = await listMobs(blocks, scope);
  return c.json(mobs);
});

mobRoutes.post("/", jsonValidator(mobCreateSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const data = c.req.valid("json");

  if (!(await canAccessVnum(data.vnum, user, "mob"))) {
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

mobRoutes.get("/:vnum", requireVnumAccess("mob"), async (c) => {
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
  requireVnumAccess("mob"),
  jsonValidator(mobInputSchema),
  async (c) => {
    const user = c.get("user");
    const scope = { owner: user.playerName };
    const vnum = Number(c.req.param("vnum"));

    const current = await getMob(vnum, scope);
    if (!current) {
      return c.json({ error: "Mob not found" }, 404);
    }

    const data = c.req.valid("json");
    if (
      !hasPower(user.powers, POWER.MEDIT_IMP_POWER) &&
      isUnassignableMobSpecProc(data.spec_proc)
    ) {
      data.spec_proc = current.spec_proc;
    }
    await updateMob(vnum, data, scope);
    const updated = await getMob(vnum, scope);
    return c.json(updated);
  },
);

mobRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const { vnums } = c.req.valid("json");

  const otherBlocks = hasExpandedAccess(user.powers, "mob")
    ? await getOtherBuildersBlocks(user.playerName)
    : undefined;
  const accessChecks = await Promise.all(
    vnums.map(async (v) => ({
      ok: await canAccessVnum(v, user, "mob", otherBlocks),
      v,
    })),
  );
  const unauthorized = accessChecks.filter((r) => !r.ok).map((r) => r.v);
  if (unauthorized.length > 0) {
    return c.json(
      { error: `Vnums outside assigned blocks: ${unauthorized.join(", ")}` },
      403,
    );
  }

  const deleted = await deleteMobs(vnums, scope);
  return c.json({ deleted, ok: true });
});

mobRoutes.delete("/:vnum", requireVnumAccess("mob"), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  if (!(await mobExists(vnum, scope))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  await deleteMob(vnum, scope);
  return c.json({ ok: true });
});
