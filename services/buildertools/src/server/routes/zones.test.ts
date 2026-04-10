import { beforeAll, describe, expect, test } from "bun:test";

import { app } from "../app.ts";
import { authRequest, getAuthCookie } from "../test-helpers.ts";

describe("zone routes", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getAuthCookie(app, "testbuilder");
  });

  test("GET /api/zones returns zone list", async () => {
    const res = await authRequest(app, "/api/zones", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    if (!Array.isArray(body)) {
      throw new TypeError("Expected array response");
    }
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty("zone_name");
    expect(body[0]).toHaveProperty("zone_nr");
  });

  test("unauthenticated request returns 401", async () => {
    const res = await app.request("/api/zones", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    expect(res.status).toBe(401);
  });

  test("request without X-Requested-With returns 403", async () => {
    const res = await app.request("/api/zones", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});
