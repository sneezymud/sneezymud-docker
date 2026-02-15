import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";

import { authRoutes } from "./routes/auth.ts";
import { mobResponseRoutes } from "./routes/mob-responses.ts";
import { mobRoutes } from "./routes/mobs.ts";
import { objectRoutes } from "./routes/objects.ts";
import { roomRoutes } from "./routes/rooms.ts";
import { zoneRoutes } from "./routes/zones.ts";

const app = new Hono();

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

// In production, serve the Vite-built frontend assets
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./.artifacts/build" }));

  // SPA fallback: serve index.html for any non-API, non-asset route
  app.get("*", serveStatic({ path: "./.artifacts/build/index.html" }));
}

const port = Number(process.env["API_PORT"]) || 3001;

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`API server listening on http://localhost:${String(port)}`);
