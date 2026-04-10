import { beforeAll, describe, expect, test } from "bun:test";

import { app } from "../app.ts";
import { authRequest, getAuthCookie, testUser } from "../test-helpers.ts";

let lowOnlyCookie: string;

beforeAll(async () => {
  lowOnlyCookie = await getAuthCookie(app, "lowonlybuilder");
});

// ---------------------------------------------------------------------------
// GET /api/players/:id
// ---------------------------------------------------------------------------

describe("player name endpoint", () => {
  test("returns id + name for existing player", async () => {
    const res = await authRequest(
      app,
      `/api/players/${testUser.playerId}`,
      lowOnlyCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({
      id: testUser.playerId,
      name: testUser.playerName,
    });
  });

  test("returns 404 for nonexistent player", async () => {
    const res = await authRequest(app, "/api/players/999999", lowOnlyCookie);
    expect(res.status).toBe(404);
  });

  test("returns 401 without auth", async () => {
    const res = await app.request(`/api/players/${testUser.playerId}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    expect(res.status).toBe(401);
  });

  test("returns 400 for non-numeric id", async () => {
    const res = await authRequest(app, "/api/players/abc", lowOnlyCookie);
    expect(res.status).toBe(400);
  });
});
