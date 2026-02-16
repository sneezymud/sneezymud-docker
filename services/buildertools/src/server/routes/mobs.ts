import { Hono } from "hono";

import { mobCreateSchema, mobSchema } from "@/shared/schemas/mob.ts";

import { type AuthEnv, requireAuth } from "../auth/middleware.ts";
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

mobRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body: unknown = await c.req.json();
  const parsed = mobCreateSchema.safeParse(body);

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

  if (await mobExists(parsed.data.vnum)) {
    return c.json({ error: "Mob already exists" }, 409);
  }

  await createMob(parsed.data.vnum, user.playerName);
  const mob = await getMob(parsed.data.vnum);
  return c.json(mob, 201);
});

mobRoutes.get("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  const mob = await getMob(vnum);
  if (!mob) {
    return c.json({ error: "Mob not found" }, 404);
  }

  return c.json(mob);
});

mobRoutes.put("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await mobExists(vnum))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  const body: unknown = await c.req.json();
  const parsed = mobSchema.safeParse(body);

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

  await updateMob(vnum, parsed.data, user.playerName);
  const updated = await getMob(vnum);
  return c.json(updated);
});

mobRoutes.delete("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await mobExists(vnum))) {
    return c.json({ error: "Mob not found" }, 404);
  }

  await deleteMob(vnum);
  return c.json({ ok: true });
});
