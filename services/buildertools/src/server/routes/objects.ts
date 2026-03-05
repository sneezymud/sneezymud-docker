import { Hono } from "hono";

import { hasPower, POWER } from "@/shared/powers.ts";
import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { objCreateSchema, objInputSchema } from "@/shared/schemas/obj.ts";
import { isUnassignableObjSpecProc } from "@/shared/spec-proc-access.ts";

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

export const objectRoutes = new Hono<AuthEnv>();

objectRoutes.use(requireAuth);
objectRoutes.use(requirePower(POWER.OEDIT));

objectRoutes.get("/", async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const blocks = hasExpandedAccess(user.powers, "object") ? null : user.blocks;
  const objects = await listObjects(blocks, scope);
  return c.json(objects);
});

objectRoutes.post("/", jsonValidator(objCreateSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const data = c.req.valid("json");

  if (!(await canAccessVnum(data.vnum, user, "object"))) {
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
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));
  const name = await getObjectShortDesc(vnum, scope);
  return c.json({ name, vnum });
});

objectRoutes.get("/search", async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const query = c.req.query("q") ?? "";
  if (query.length < 2) {
    return c.json([]);
  }
  const results = await searchObjects(query, scope);
  return c.json(results);
});

objectRoutes.get("/:vnum", requireVnumAccess("object"), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  const obj = await getObject(vnum, scope);
  if (!obj) {
    return c.json({ error: "Object not found" }, 404);
  }

  return c.json(obj);
});

objectRoutes.put(
  "/:vnum",
  requireVnumAccess("object"),
  jsonValidator(objInputSchema),
  async (c) => {
    const user = c.get("user");
    const scope = { owner: user.playerName };
    const vnum = Number(c.req.param("vnum"));

    const current = await getObject(vnum, scope);
    if (!current) {
      return c.json({ error: "Object not found" }, 404);
    }

    const data = c.req.valid("json");

    // Enforce field-level power restrictions by preserving DB values
    const ITEM_WEAPON = 5;
    const PROTOTYPE_BIT = 1 << 4;
    if (!hasPower(user.powers, POWER.OEDIT_COST)) {
      data.price = current.price;
    }
    if (!hasPower(user.powers, POWER.OEDIT_APPLYS)) {
      data.affects = current.affects;
    }
    if (
      !hasPower(user.powers, POWER.OEDIT_WEAPONS) &&
      data.type === ITEM_WEAPON
    ) {
      data.val0 = current.val0;
      data.val1 = current.val1;
      data.val2 = current.val2;
      data.val3 = current.val3;
    }
    if (!hasPower(user.powers, POWER.OEDIT_NOPROTOS)) {
      // Preserve the PROTOTYPE bit from the current value
      data.action_flag =
        (data.action_flag & ~PROTOTYPE_BIT) |
        (current.action_flag & PROTOTYPE_BIT);
    }
    if (
      !hasPower(user.powers, POWER.OEDIT_IMP_POWER) &&
      isUnassignableObjSpecProc(data.spec_proc)
    ) {
      data.spec_proc = current.spec_proc;
    }

    await updateObject(vnum, data, scope);
    const updated = await getObject(vnum, scope);
    return c.json(updated);
  },
);

objectRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const { vnums } = c.req.valid("json");

  const otherBlocks = hasExpandedAccess(user.powers, "object")
    ? await getOtherBuildersBlocks(user.playerName)
    : undefined;
  const accessChecks = await Promise.all(
    vnums.map(async (v) => ({
      ok: await canAccessVnum(v, user, "object", otherBlocks),
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

  const deleted = await deleteObjects(vnums, scope);
  return c.json({ deleted, ok: true });
});

objectRoutes.delete("/:vnum", requireVnumAccess("object"), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  if (!(await objectExists(vnum, scope))) {
    return c.json({ error: "Object not found" }, 404);
  }

  await deleteObject(vnum, scope);
  return c.json({ ok: true });
});
