import { Hono } from "hono";

import { hasPower, POWER } from "@/shared/powers.ts";
import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { mobCreateSchema, mobInputSchema } from "@/shared/schemas/mob.ts";
import { isUnassignableMobSpecProc } from "@/shared/spec-proc-access.ts";

import {
  type AuthEnv,
  canAccessVnum,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
  requireWritePower,
  resolveListOwner,
  resolveTargetOwner,
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
import { resolvePlayerNames } from "../queries/player-names.ts";
import { EntityNotFoundError } from "../queries/publish.ts";

export const mobRoutes = new Hono<AuthEnv>();

mobRoutes.use(requireAuth);
mobRoutes.use(requireWritePower(POWER.MEDIT));

mobRoutes.get("/", async (c) => {
  const user = c.get("user");
  const resolved = resolveListOwner(c, user);
  if (resolved.kind === "forbidden")
    return c.json({ error: resolved.reason }, 403);
  if (resolved.kind === "bad_request")
    return c.json({ error: resolved.reason }, 400);
  const scope = resolved.scope;
  const blocks = user.isSenior ? null : user.blocks;
  const includeOwnerName = scope === "all" || scope.playerId !== user.playerId;
  const rows = await listMobs(blocks, scope, { includeOwnerName });
  if (includeOwnerName) {
    const ids = [
      ...new Set(
        rows.map((r) => r.player_id).filter((id): id is number => id != null),
      ),
    ];
    const names = await resolvePlayerNames(ids);
    return c.json(
      rows.map((r) => ({
        ...r,
        owner: names.get(r.player_id ?? 0) ?? "Unknown",
        playerId: r.player_id,
      })),
    );
  }
  return c.json(rows);
});

mobRoutes.post("/", jsonValidator(mobCreateSchema), async (c) => {
  const user = c.get("user");
  if (c.req.query("owner") !== undefined) {
    return c.json({ error: "owner parameter not allowed on create" }, 400);
  }
  const scope = { playerId: user.playerId };
  const data = c.req.valid("json");

  if (!canAccessVnum(data.vnum, user)) {
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
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));

  const foundMob = await getMob(vnum, scope);
  if (!foundMob) {
    return c.json({ error: "Mob not found" }, 404);
  }

  return c.json(foundMob);
});

mobRoutes.put(
  "/:vnum",
  requireVnumAccess("mob"),
  jsonValidator(mobInputSchema),
  async (c) => {
    const user = c.get("user");
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    const scope = { playerId: target.playerId };
    const vnum = Number(c.req.param("vnum"));

    const current = await getMob(vnum, scope);
    if (!current) {
      return c.json({ error: "Mob not found" }, 404);
    }

    const data = c.req.valid("json");
    if (
      !user.isSenior &&
      !hasPower(user.powers, POWER.MEDIT_IMP_POWER) &&
      isUnassignableMobSpecProc(data.spec_proc) &&
      data.spec_proc !== current.spec_proc
    ) {
      return c.json(
        {
          error:
            'Changing "spec_proc" to an unassignable value requires POWER_MEDIT_IMP_POWER',
        },
        403,
      );
    }
    try {
      await updateMob(vnum, data, scope);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: "Mob not found" }, 404);
      }
      throw error;
    }
    const updated = await getMob(vnum, scope);
    return c.json(updated);
  },
);

mobRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  if (c.req.query("owner") !== undefined) {
    return c.json({ error: "owner parameter not allowed on bulk delete" }, 400);
  }
  const scope = { playerId: user.playerId };
  const { vnums } = c.req.valid("json");

  const accessChecks = vnums.map((v) => ({
    ok: canAccessVnum(v, user),
    v,
  }));
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
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));

  if (!(await mobExists(vnum, scope))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  await deleteMob(vnum, scope);
  return c.json({ ok: true });
});
