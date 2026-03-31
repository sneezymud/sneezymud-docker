import { describe, expect, test } from "bun:test";

import { app } from "../app.ts";
import {
  extractCookie,
  noBlocksUser,
  nonBuilderUser,
  testUser,
} from "../test-helpers.ts";

function loginRequest(body: Record<string, unknown>) {
  return app.request("/api/auth/login", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
}

describe("POST /api/auth/login", () => {
  test("builder can log in with valid credentials", async () => {
    const res = await loginRequest({
      password: "testpass",
      username: "testbuilder",
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toContain("bt_session=");
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        blocks: testUser.blocks,
        playerName: testUser.playerName,
        username: testUser.username,
      }),
    );
  });

  test("wrong password returns 401 with generic message", async () => {
    const res = await loginRequest({
      password: "wrongpassword",
      username: "testbuilder",
    });

    expect(res.status).toBe(401);
    // Must not reveal whether username or password was wrong
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Invalid username or password");
  });

  test("nonexistent user returns 401 with same generic message", async () => {
    const res = await loginRequest({
      password: "anything",
      username: "nosuchuser",
    });

    expect(res.status).toBe(401);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Invalid username or password");
  });

  test("missing fields returns 400", async () => {
    const res = await loginRequest({ username: "testbuilder" });

    expect(res.status).toBe(400);
  });

  test("user with no vnum blocks can log in with POWER_BUILDER", async () => {
    const res = await loginRequest({
      password: noBlocksUser.password,
      username: noBlocksUser.username,
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        blocks: [],
        playerName: noBlocksUser.playerName,
      }),
    );
  });

  test("user without POWER_BUILDER gets 403 with player name in message", async () => {
    const res = await loginRequest({
      password: nonBuilderUser.password,
      username: nonBuilderUser.username,
    });

    expect(res.status).toBe(403);
    const body: unknown = await res.json();
    expect(body).toHaveProperty(
      "error",
      expect.stringContaining(nonBuilderUser.playerName),
    );
    expect(body).toHaveProperty(
      "error",
      expect.stringContaining("does not have builder access"),
    );
  });
});

describe("GET /api/auth/me", () => {
  test("returns user data with valid session", async () => {
    const loginRes = await loginRequest({
      password: "testpass",
      username: "testbuilder",
    });
    const cookie = extractCookie(loginRes);

    const res = await app.request("/api/auth/me", {
      headers: { Cookie: cookie, "X-Requested-With": "XMLHttpRequest" },
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        blocks: testUser.blocks,
        username: testUser.username,
      }),
    );
  });

  test("returns 401 without session", async () => {
    const res = await app.request("/api/auth/me", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    expect(res.status).toBe(401);
  });

  test("returns 403 without X-Requested-With header", async () => {
    const loginRes = await loginRequest({
      password: "testpass",
      username: "testbuilder",
    });
    const cookie = extractCookie(loginRes);

    const res = await app.request("/api/auth/me", {
      headers: { Cookie: cookie },
    });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/logout", () => {
  test("clears session so subsequent /me returns 401", async () => {
    const loginRes = await loginRequest({
      password: "testpass",
      username: "testbuilder",
    });
    const cookie = extractCookie(loginRes);

    const logoutRes = await app.request("/api/auth/logout", {
      headers: { Cookie: cookie, "X-Requested-With": "XMLHttpRequest" },
      method: "POST",
    });
    expect(logoutRes.status).toBe(200);

    // The logout response should have a Set-Cookie that clears the session
    const clearCookie = extractCookie(logoutRes);

    const meRes = await app.request("/api/auth/me", {
      headers: { Cookie: clearCookie, "X-Requested-With": "XMLHttpRequest" },
    });
    expect(meRes.status).toBe(401);
  });
});

describe("GET /api/health", () => {
  test("returns ok without authentication", async () => {
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
