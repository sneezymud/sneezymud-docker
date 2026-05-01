// Spawns a Bun server process against test databases for E2E tests.
// Polls /api/health until the server is ready.
//
// Uses child_process.spawn (not Bun.spawn) for portability - Playwright's
// globalSetup may run in Node.js context even when invoked via bunx.

import type { FullConfig } from "@playwright/test";

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;
const MAX_WAIT_MS = 15_000;
const POLL_INTERVAL_MS = 250;

export default async function globalSetup(_config: FullConfig) {
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );

  // Seed test databases (same as bun test preload - truncates + seeds auth)
  const seed = spawn(
    "bun",
    [
      "--eval",
      "await import('./src/server/test-preload.ts'); process.exit(0);",
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        DB_NAME_IMMORTAL: "immortal_test",
        DB_NAME_SNEEZY: "sneezy_test",
      },
      stdio: "inherit",
    },
  );
  await new Promise<void>((resolve, reject) => {
    seed.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Seed failed (exit ${code})`));
    });
  });

  const serverProcess = spawn("bun", ["src/server/index.ts"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      API_PORT: String(PORT),
      BT_SESSION_SECRET: "test-secret",
      DB_NAME_IMMORTAL: "immortal_test",
      DB_NAME_SNEEZY: "sneezy_test",
      NODE_ENV: "production",
    },
    stdio: "inherit",
  });

  const pid = serverProcess.pid;
  if (!pid) {
    throw new Error("Failed to spawn server process");
  }
  process.env["E2E_SERVER_PID"] = String(pid);

  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        console.log(`E2E server ready on port ${PORT} (PID ${pid})`);
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  serverProcess.kill("SIGTERM");
  throw new Error(`E2E server failed to start within ${MAX_WAIT_MS}ms`);
}
