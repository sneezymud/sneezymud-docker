// src/server/routes/power-gates-rejection.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import {
  authRequest,
  cleanupTestVnums,
  getAuthCookie,
  validMobPayload,
  validObjPayload,
  validRoomPayload,
} from "../test-helpers.ts";

// noBlocksUser has POWER_BUILDER only - no MEDIT, OEDIT, REDIT, RSAVE, EDIT.
// testUser has all powers (used for control tests).
let noBlocksCookie: string;
let testCookie: string;

beforeAll(async () => {
  noBlocksCookie = await getAuthCookie(app, "noblocks");
  testCookie = await getAuthCookie(app, "testbuilder");
});

afterAll(() =>
  cleanupTestVnums({
    db: immortalDb,
    vnums: [131, 132, 133, 134],
  }),
);

// -- Mobs: requirePower(POWER.MEDIT) --

describe("mob endpoints reject user without MEDIT", () => {
  // Control: testUser can create a mob (proves the endpoint works)
  beforeAll(async () => {
    await authRequest(app, "/api/mobs", testCookie, {
      body: JSON.stringify({ vnum: 131 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  test("GET /api/mobs/131 returns 403", async () => {
    const res = await authRequest(app, "/api/mobs/131", noBlocksCookie);
    expect(res.status).toBe(403);
  });

  test("POST /api/mobs returns 403", async () => {
    const res = await authRequest(app, "/api/mobs", noBlocksCookie, {
      body: JSON.stringify({ vnum: 139 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(403);
  });

  test("PUT /api/mobs/131 returns 403", async () => {
    const res = await authRequest(app, "/api/mobs/131", noBlocksCookie, {
      body: JSON.stringify(validMobPayload({ vnum: 131 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(403);
  });

  test("DELETE /api/mobs/131 returns 403", async () => {
    const res = await authRequest(app, "/api/mobs/131", noBlocksCookie, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });

  test("control: testUser can GET /api/mobs/131", async () => {
    const res = await authRequest(app, "/api/mobs/131", testCookie);
    expect(res.status).toBe(200);
  });
});

// -- Objects: requirePower(POWER.OEDIT) --

describe("object endpoints reject user without OEDIT", () => {
  beforeAll(async () => {
    await authRequest(app, "/api/objects", testCookie, {
      body: JSON.stringify({ vnum: 132 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  test("GET /api/objects/132 returns 403", async () => {
    const res = await authRequest(app, "/api/objects/132", noBlocksCookie);
    expect(res.status).toBe(403);
  });

  test("POST /api/objects returns 403", async () => {
    const res = await authRequest(app, "/api/objects", noBlocksCookie, {
      body: JSON.stringify({ vnum: 139 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(403);
  });

  test("PUT /api/objects/132 returns 403", async () => {
    const res = await authRequest(app, "/api/objects/132", noBlocksCookie, {
      body: JSON.stringify(validObjPayload({ vnum: 132 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(403);
  });

  test("DELETE /api/objects/132 returns 403", async () => {
    const res = await authRequest(app, "/api/objects/132", noBlocksCookie, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });

  test("control: testUser can GET /api/objects/132", async () => {
    const res = await authRequest(app, "/api/objects/132", testCookie);
    expect(res.status).toBe(200);
  });
});

// -- Rooms: requirePower(POWER.REDIT, POWER.RSAVE, POWER.EDIT) --

describe("room endpoints reject user without REDIT+RSAVE+EDIT", () => {
  beforeAll(async () => {
    await authRequest(app, "/api/rooms", testCookie, {
      body: JSON.stringify({ vnum: 133 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  test("GET /api/rooms/133 returns 403", async () => {
    const res = await authRequest(app, "/api/rooms/133", noBlocksCookie);
    expect(res.status).toBe(403);
  });

  test("POST /api/rooms returns 403", async () => {
    const res = await authRequest(app, "/api/rooms", noBlocksCookie, {
      body: JSON.stringify({ vnum: 139 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(403);
  });

  test("PUT /api/rooms/133 returns 403", async () => {
    const res = await authRequest(app, "/api/rooms/133", noBlocksCookie, {
      body: JSON.stringify(validRoomPayload({ vnum: 133 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(403);
  });

  test("DELETE /api/rooms/133 returns 403", async () => {
    const res = await authRequest(app, "/api/rooms/133", noBlocksCookie, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });

  test("control: testUser can GET /api/rooms/133", async () => {
    const res = await authRequest(app, "/api/rooms/133", testCookie);
    expect(res.status).toBe(200);
  });
});

// -- Mob Responses: requirePower(POWER.MEDIT), only GET and PUT --

describe("mob response endpoints reject user without MEDIT", () => {
  beforeAll(async () => {
    // Mob must exist for mob-response GET to return 200 (not 404)
    await authRequest(app, "/api/mobs", testCookie, {
      body: JSON.stringify({ vnum: 134 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  test("GET /api/mob-responses/134 returns 403", async () => {
    const res = await authRequest(
      app,
      "/api/mob-responses/134",
      noBlocksCookie,
    );
    expect(res.status).toBe(403);
  });

  test("PUT /api/mob-responses/134 returns 403", async () => {
    const res = await authRequest(
      app,
      "/api/mob-responses/134",
      noBlocksCookie,
      {
        body: JSON.stringify({ response: 'say {"hello";}', vnum: 134 }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(res.status).toBe(403);
  });

  test("control: testUser can GET /api/mob-responses/134", async () => {
    const res = await authRequest(app, "/api/mob-responses/134", testCookie);
    expect(res.status).toBe(200);
  });
});
