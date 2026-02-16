import { Hono } from "hono";

import { objCreateSchema, objSchema } from "@/shared/schemas/obj.ts";

import { type AuthEnv, requireAuth } from "../auth/middleware.ts";
import {
  createObject,
  deleteObject,
  getObject,
  listObjects,
  objectExists,
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

objectRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body: unknown = await c.req.json();
  const parsed = objCreateSchema.safeParse(body);

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

  if (!isVnumInBlocks(parsed.data.vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await objectExists(parsed.data.vnum)) {
    return c.json({ error: "Object already exists" }, 409);
  }

  await createObject(parsed.data.vnum, user.playerName);
  const obj = await getObject(parsed.data.vnum);
  return c.json(obj, 201);
});

objectRoutes.get("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  const obj = await getObject(vnum);
  if (!obj) {
    return c.json({ error: "Object not found" }, 404);
  }

  return c.json(obj);
});

objectRoutes.put("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await objectExists(vnum))) {
    return c.json({ error: "Object not found" }, 404);
  }

  const body: unknown = await c.req.json();
  const parsed = objSchema.safeParse(body);

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

  await updateObject(vnum, parsed.data, user.playerName);
  const updated = await getObject(vnum);
  return c.json(updated);
});

objectRoutes.delete("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await objectExists(vnum))) {
    return c.json({ error: "Object not found" }, 404);
  }

  await deleteObject(vnum);
  return c.json({ ok: true });
});
