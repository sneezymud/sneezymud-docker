// Kills the Bun server process spawned by global-setup.

import type { FullConfig } from "@playwright/test";

export default function globalTeardown(_config: FullConfig) {
  const pid = Number(process.env["E2E_SERVER_PID"]);
  if (pid) {
    try {
      process.kill(pid, "SIGTERM");
      console.log(`E2E server (PID ${pid}) terminated`);
    } catch {
      // Already dead
    }
  }
}
