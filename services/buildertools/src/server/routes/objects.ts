import { Hono } from "hono";

import { hasPower, POWER } from "@/shared/powers.ts";
import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { objCreateSchema, objInputSchema } from "@/shared/schemas/obj.ts";
import { isUnassignableObjSpecProc } from "@/shared/spec-proc-access.ts";

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
  createObject,
  deleteObject,
  deleteObjects,
  getObject,
  getObjectShortDesc,
  listObjects,
  objectExists,
  searchObjects,
  updateObject,
} from "../queries/objects.ts";
import { resolvePlayerNames } from "../queries/player-names.ts";
import { EntityNotFoundError } from "../queries/publish.ts";

export const objectRoutes = new Hono<AuthEnv>();

objectRoutes.use(requireAuth);
objectRoutes.use(requireWritePower(POWER.OEDIT));

objectRoutes.get("/", async (c) => {
  const user = c.get("user");
  const resolved = resolveListOwner(c, user);
  if (resolved.kind === "forbidden")
    return c.json({ error: resolved.reason }, 403);
  if (resolved.kind === "bad_request")
    return c.json({ error: resolved.reason }, 400);
  const scope = resolved.scope;
  const blocks = user.isSenior ? null : user.blocks;
  const includeOwnerName = scope === "all" || scope.playerId !== user.playerId;
  const rows = await listObjects(blocks, scope, { includeOwnerName });
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
      })),
    );
  }
  return c.json(rows);
});

objectRoutes.post("/", jsonValidator(objCreateSchema), async (c) => {
  const user = c.get("user");
  if (c.req.query("owner") !== undefined) {
    return c.json({ error: "owner parameter not allowed on create" }, 400);
  }
  const scope = { playerId: user.playerId };
  const data = c.req.valid("json");

  if (!canAccessVnum(data.vnum, user)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await objectExists(data.vnum, scope)) {
    return c.json({ error: "Object already exists" }, 409);
  }

  try {
    await createObject(data.vnum, scope);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return c.json({ error: "Object already exists" }, 409);
    }
    throw error;
  }
  const obj = await getObject(data.vnum, scope);
  return c.json(obj, 201);
});

objectRoutes.get("/name/:vnum", async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));
  const name = await getObjectShortDesc(vnum, scope);
  return c.json({ name, vnum });
});

objectRoutes.get("/search", async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const query = c.req.query("q") ?? "";
  if (query.length < 2) {
    return c.json([]);
  }
  const results = await searchObjects(query, scope);
  return c.json(results);
});

objectRoutes.get("/:vnum", requireVnumAccess("object"), async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));

  const foundObj = await getObject(vnum, scope);
  if (!foundObj) {
    return c.json({ error: "Object not found" }, 404);
  }

  return c.json(foundObj);
});

objectRoutes.put(
  "/:vnum",
  requireVnumAccess("object"),
  jsonValidator(objInputSchema),
  async (c) => {
    const user = c.get("user");
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    const scope = { playerId: target.playerId };
    const vnum = Number(c.req.param("vnum"));

    const current = await getObject(vnum, scope);
    if (!current) {
      return c.json({ error: "Object not found" }, 404);
    }

    const data = c.req.valid("json");

    // Enforce field-level power restrictions
    const ITEM_WEAPON = 5;
    const PROTOTYPE_BIT = 1 << 4;
    if (!user.isSenior) {
      if (
        !hasPower(user.powers, POWER.OEDIT_COST) &&
        data.price !== current.price
      ) {
        return c.json(
          { error: 'Changing "price" requires POWER_OEDIT_COST' },
          403,
        );
      }
      if (
        !hasPower(user.powers, POWER.OEDIT_APPLYS) &&
        JSON.stringify(data.affects) !== JSON.stringify(current.affects)
      ) {
        return c.json(
          { error: 'Changing "affects" requires POWER_OEDIT_APPLYS' },
          403,
        );
      }
      if (
        !hasPower(user.powers, POWER.OEDIT_WEAPONS) &&
        data.type === ITEM_WEAPON &&
        (data.val0 !== current.val0 ||
          data.val1 !== current.val1 ||
          data.val2 !== current.val2 ||
          data.val3 !== current.val3)
      ) {
        return c.json(
          { error: "Changing weapon values requires POWER_OEDIT_WEAPONS" },
          403,
        );
      }
      if (
        !hasPower(user.powers, POWER.OEDIT_NOPROTOS) &&
        (data.action_flag & PROTOTYPE_BIT) !==
          (current.action_flag & PROTOTYPE_BIT)
      ) {
        return c.json(
          {
            error: "Changing the prototype flag requires POWER_OEDIT_NOPROTOS",
          },
          403,
        );
      }
      if (
        !hasPower(user.powers, POWER.OEDIT_IMP_POWER) &&
        isUnassignableObjSpecProc(data.spec_proc) &&
        data.spec_proc !== current.spec_proc
      ) {
        return c.json(
          {
            error:
              'Changing "spec_proc" to an unassignable value requires POWER_OEDIT_IMP_POWER',
          },
          403,
        );
      }
    }

    try {
      await updateObject(vnum, data, scope);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: "Object not found" }, 404);
      }
      throw error;
    }
    const updated = await getObject(vnum, scope);
    return c.json(updated);
  },
);

objectRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
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

  const deleted = await deleteObjects(vnums, scope);
  return c.json({ deleted, ok: true });
});

objectRoutes.delete("/:vnum", requireVnumAccess("object"), async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));

  if (!(await objectExists(vnum, scope))) {
    return c.json({ error: "Object not found" }, 404);
  }

  await deleteObject(vnum, scope);
  return c.json({ ok: true });
});
