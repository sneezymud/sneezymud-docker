import { Hono } from "hono";
import { logger } from "hono/logger";

import { authRoutes } from "./routes/auth.ts";
import { mobResponseRoutes } from "./routes/mob-responses.ts";
import { mobRoutes } from "./routes/mobs.ts";
import { objectRoutes } from "./routes/objects.ts";
import { roomRoutes } from "./routes/rooms.ts";
import { zoneRoutes } from "./routes/zones.ts";

export const app = new Hono();

app.use(logger());

app.onError((err, c) => {
  console.error("Unhandled API error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/auth", authRoutes);
app.route("/api/rooms", roomRoutes);
app.route("/api/objects", objectRoutes);
app.route("/api/mobs", mobRoutes);
app.route("/api/mob-responses", mobResponseRoutes);
app.route("/api/zones", zoneRoutes);
