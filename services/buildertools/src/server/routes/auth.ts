import { Hono } from "hono";

import { loginRequestSchema } from "@/shared/schemas/auth.ts";

import { createSession, destroySession, getSession } from "../auth/session.ts";
import { authenticateBuilder } from "../queries/auth.ts";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body: unknown = await c.req.json();
  const parsed = loginRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request" }, 400);
  }

  const user = await authenticateBuilder(
    parsed.data.username,
    parsed.data.password,
  );
  if (!user) {
    return c.json(
      { error: "Invalid credentials or no assigned vnum blocks" },
      401,
    );
  }

  createSession(c, user);
  return c.json(user);
});

authRoutes.post("/logout", (c) => {
  destroySession(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", (c) => {
  const user = getSession(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  return c.json(user);
});
