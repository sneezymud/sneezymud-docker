import { createMiddleware } from "hono/factory";

import type { SessionUser } from "@/shared/schemas/auth.ts";

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
