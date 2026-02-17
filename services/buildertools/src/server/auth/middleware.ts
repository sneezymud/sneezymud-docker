import type { ZodType } from "zod";

import { zValidator } from "@hono/zod-validator";
import { createMiddleware } from "hono/factory";

import type { SessionUser } from "@/shared/schemas/auth.ts";

import { isVnumInBlocks } from "../queries/vnum-access.ts";
import { getSession, touchSession } from "./session.ts";

export interface AuthEnv {
  Variables: {
    user: SessionUser;
  };
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.req.header("X-Requested-With") !== "XMLHttpRequest") {
    return c.json({ error: "Invalid request origin" }, 403);
  }
  const user = getSession(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  touchSession(c);
  c.set("user", user);
  return next();
});

export const requireVnumAccess = createMiddleware<AuthEnv>(async (c, next) => {
  const vnum = Number(c.req.param("vnum"));
  const user = c.get("user");
  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }
  return next();
});

export function jsonValidator<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "Validation failed",
          issues: result.error.issues.map((i) => ({
            message: i.message,
            path: i.path.map(String),
          })),
        },
        400,
      );
    }
    return;
  });
}
