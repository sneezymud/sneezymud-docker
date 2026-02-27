import { serveStatic } from "hono/bun";

import { app } from "./app.ts";

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

console.log(`API server listening on http://localhost:${port}`);
