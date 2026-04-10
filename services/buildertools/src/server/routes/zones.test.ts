import { describe, expect, test } from "bun:test";

import { app } from "../app.ts";
import { authRequest, getAuthCookie } from "../test-helpers.ts";

describe("zone listing", () => {
  test("lists all zones", async () => {
    const cookie = await getAuthCookie(app, "testbuilder");
    const res = await authRequest(app, "/api/zones", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toBeInstanceOf(Array);
    // The test preload seeds zone_nr=1
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ zone_name: "Test Zone", zone_nr: 1 }),
      ]),
    );
  });

  test("unauthenticated request returns 401", async () => {
    const res = await app.request("/api/zones", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    expect(res.status).toBe(401);
  });

  test("request without X-Requested-With returns 403", async () => {
    const cookie = await getAuthCookie(app, "testbuilder");
    const res = await app.request("/api/zones", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});
