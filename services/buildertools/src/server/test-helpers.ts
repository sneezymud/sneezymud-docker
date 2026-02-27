import type { Hono } from "hono";

import type { SessionUser } from "@/shared/schemas/auth.ts";

// Test builder: vnum blocks 100-199
export const testUser: SessionUser = {
  blocks: [{ end: 199, start: 100 }],
  playerName: "TestBuilder",
  username: "testbuilder",
};

// No-blocks user: valid credentials but no vnum assignments
export const noBlocksUser = {
  password: "testpass",
  playerName: "NoBlocks",
  username: "noblocks",
};

const TEST_PASSWORD = "testpass";

/**
 * Log in as the test builder and return the session cookie string.
 */
export async function getAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: testUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  return cookie;
}

/**
 * Make an authenticated request to the app.
 */
export async function authRequest(
  app: Hono,
  path: string,
  cookie: string,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  headers.set("Cookie", cookie);
  headers.set("X-Requested-With", "XMLHttpRequest");
  return app.request(path, { ...options, headers });
}

/**
 * Extract the session cookie from a login response, throwing if absent.
 */
export function extractCookie(res: Response): string {
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error("Expected Set-Cookie header");
  }
  return cookie;
}
