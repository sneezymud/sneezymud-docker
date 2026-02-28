import { Hono } from "hono";
import { z } from "zod";

import { objCreateSchema, objInputSchema } from "@/shared/schemas/obj.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
} from "../auth/middleware.ts";
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
import { isVnumInBlocks } from "../queries/vnum-access.ts";

export const objectRoutes = new Hono<AuthEnv>();

objectRoutes.use(requireAuth);

objectRoutes.get("/", async (c) => {
  const user = c.get("user");
  const objects = await listObjects(user.blocks);
  return c.json(objects);
});

objectRoutes.post("/", jsonValidator(objCreateSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  if (!isVnumInBlocks(data.vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await objectExists(data.vnum)) {
    return c.json({ error: "Object already exists" }, 409);
  }

  await createObject(data.vnum, user.playerName);
  const obj = await getObject(data.vnum);
  return c.json(obj, 201);
});

objectRoutes.get("/name/:vnum", async (c) => {
  const vnum = Number(c.req.param("vnum"));
  const name = await getObjectShortDesc(vnum);
  return c.json({ name, vnum });
});

objectRoutes.get("/search", async (c) => {
  const query = c.req.query("q") ?? "";
  if (query.length < 2) {
    return c.json([]);
  }
  const results = await searchObjects(query);
  return c.json(results);
});

objectRoutes.get("/:vnum", requireVnumAccess, async (c) => {
  const vnum = Number(c.req.param("vnum"));

  const obj = await getObject(vnum);
  if (!obj) {
    return c.json({ error: "Object not found" }, 404);
  }

  return c.json(obj);
});

objectRoutes.put(
  "/:vnum",
  requireVnumAccess,
  jsonValidator(objInputSchema),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));

    if (!(await objectExists(vnum))) {
      return c.json({ error: "Object not found" }, 404);
    }

    const data = c.req.valid("json");
    await updateObject(vnum, data, user.playerName);
    const updated = await getObject(vnum);
    return c.json(updated);
  },
);

const bulkDeleteSchema = z.object({
  vnums: z.array(z.number().int()).min(1).max(200),
});

objectRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  const { vnums } = c.req.valid("json");

  const unauthorized = vnums.filter((v) => !isVnumInBlocks(v, user.blocks));
  if (unauthorized.length > 0) {
    return c.json(
      { error: `Vnums outside assigned blocks: ${unauthorized.join(", ")}` },
      403,
    );
  }

  const deleted = await deleteObjects(vnums);
  return c.json({ deleted, ok: true });
});

objectRoutes.delete("/:vnum", requireVnumAccess, async (c) => {
  const vnum = Number(c.req.param("vnum"));

  if (!(await objectExists(vnum))) {
    return c.json({ error: "Object not found" }, 404);
  }

  await deleteObject(vnum);
  return c.json({ ok: true });
});
