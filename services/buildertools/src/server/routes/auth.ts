import { Hono } from "hono";

import { loginRequestSchema } from "@/shared/schemas/auth.ts";

import { jsonValidator } from "../auth/middleware.ts";
import { createSession, destroySession, getSession } from "../auth/session.ts";
import { authenticateBuilder } from "../queries/auth.ts";

export const authRoutes = new Hono();

authRoutes.post("/login", jsonValidator(loginRequestSchema), async (c) => {
  if (c.req.header("X-Requested-With") !== "XMLHttpRequest") {
    return c.json({ error: "Invalid request origin" }, 403);
  }
  const { password, username } = c.req.valid("json");

  const result = await authenticateBuilder(username, password);

  if (result.kind === "not_found" || result.kind === "wrong_password") {
    return c.json({ error: "Invalid username or password" }, 401);
  }
  if (result.kind === "not_immortal") {
    return c.json(
      {
        error: `${result.playerName} does not have builder access - contact an admin`,
      },
      403,
    );
  }

  createSession(c, result.user);
  return c.json(result.user);
});

authRoutes.post("/logout", (c) => {
  if (c.req.header("X-Requested-With") !== "XMLHttpRequest") {
    return c.json({ error: "Invalid request origin" }, 403);
  }
  destroySession(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", (c) => {
  if (c.req.header("X-Requested-With") !== "XMLHttpRequest") {
    return c.json({ error: "Invalid request origin" }, 403);
  }
  const user = getSession(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  return c.json(user);
});
