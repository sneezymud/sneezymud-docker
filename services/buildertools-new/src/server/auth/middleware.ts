import { createMiddleware } from "hono/factory";

import type { SessionUser } from "@/shared/schemas/auth.ts";

import { getSession } from "./session.ts";

export interface AuthEnv {
  Variables: {
    user: SessionUser;
  };
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const user = getSession(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  c.set("user", user);
  return next();
});
