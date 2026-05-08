import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { mobSchema } from "@/shared/schemas/mob.ts";
import { objSchema } from "@/shared/schemas/obj.ts";
import { roomSchema } from "@/shared/schemas/room.ts";

import { app } from "../app.ts";
import { immortalDb, sneezyDb } from "../db.ts";
import {
  getSneezyMob,
  getSneezyMobResponse,
  getSneezyObject,
  getSneezyRoom,
} from "../queries/publish.ts";
import {
  mobresponses as sneezyMobresponses,
  room as sneezyRoom,
} from "../schema/sneezy.ts";
import {
  authRequest,
  cleanupTestVnums,
  createAndUpdate,
  expandedUser,
  getAuthCookie,
  lowOnlyUser,
  otherUser,
  testUser,
  validMobPayload,
  validObjPayload,
  validRoomPayload,
} from "../test-helpers.ts";

// testUser: blocks 100-199, all builder powers, NOT senior (no POWER_LOW)
// expandedUser: blocks 200-299, POWER_LOW + NO_LIMITS, IS senior
// lowOnlyUser: blocks 300-399 + 500-599, POWER_LOW, IS senior
// noBlocksUser: no blocks, POWER_BUILDER only, NOT senior
let testCookie: string;
let expandedCookie: string;
let lowOnlyCookie: string;
let noBlocksCookie: string;
let viewOnlyCookie: string;

beforeAll(async () => {
  [testCookie, expandedCookie, lowOnlyCookie, noBlocksCookie, viewOnlyCookie] =
    await Promise.all([
      getAuthCookie(app, "testbuilder"),
      getAuthCookie(app, "expandedbuilder"),
      getAuthCookie(app, "lowonlybuilder"),
      getAuthCookie(app, "noblocks"),
      getAuthCookie(app, "viewonly"),
    ]);
});

// Vnums used across test groups - keep disjoint from other test files
const VNUMS = {
  BULK_ORPHAN_MR: 552,
  BULK_REORDER_MOB: 551,
  BULK_ROLLBACK_ROOM: 415,
  BULK_XO_A: 550,
  BULK_XO_B: 260,
  CHILD_MOD_ROOM: 414,
  CONSTRAINT_ERROR_ROOM: 553,
  CROSS_OWNER_CALLER_DRAFT: 151,
  CROSS_OWNER_PUBLISH_MOB: 431,
  CROSS_OWNER_PUBLISH_ROOM: 430,
  DASHBOARD_OWNER_ROOM: 153,
  DECIMAL_MOB: 555,
  DEEP_RT_MOB: 560,
  DEEP_RT_OBJ: 561,
  DEEP_RT_ROOM: 562,
  DIFF_MOB: 400,
  DIFF_OBJ: 401,
  DIFF_ROOM: 402,
  EMPTY_CHILDREN_ROOM: 416,
  EXPANDED_MOB: 250,
  EXPANDED_OBJ: 251,
  EXPANDED_ROOM: 252,
  MISSING_ROOM: 413,
  NO_LIMITS_PUBLISH: 152,
  NULL_NORMALIZE_MOB: 573,
  PERMISSIVE_DENY_MOB: 458,
  PERMISSIVE_DENY_OBJ: 459,
  PERMISSIVE_DENY_ROOM: 457,
  PERMISSIVE_EXP_MOB: 452,
  PERMISSIVE_EXP_OBJ: 453,
  PERMISSIVE_EXP_ROOM: 451,
  PRESERVE_MR_MOB: 554,
  PUB_BULK_MOB: 410,
  PUB_BULK_OBJ: 411,
  PUB_BULK_ROOM: 412,
  PUB_MOB: 403,
  PUB_OBJ: 404,
  PUB_ROOM: 405,
  RESPONSE_MOB: 417,
  SCOPE_MOB: 570,
  SCOPE_OBJ: 571,
  SCOPE_ROOM: 572,
  SINGLE_ORPHAN_MR: 418,
  VNUM_ACCESS_ROOM: 406,
};

afterAll(async () => {
  // Extra vnums used outside the VNUMS object: 516/517 (TEST-8), 90050 (TEST-2), 150 (TEST-OWNER-2)
  const vnums = [...Object.values(VNUMS), 150, 516, 517, 90_050];
  await cleanupTestVnums({ db: immortalDb, vnums });
  return cleanupTestVnums({ db: sneezyDb, vnums });
});

describe("publish permission model", () => {
  describe("standard builder (testUser) lacks POWER_LOW", () => {
    const singleEntityCases = [
      { entityType: "rooms", vnum: VNUMS.PUB_ROOM },
      { entityType: "mobs", vnum: VNUMS.PUB_MOB },
      { entityType: "objects", vnum: VNUMS.PUB_OBJ },
    ] as const;
    for (const { entityType, vnum } of singleEntityCases) {
      test(`POST /api/publish/${entityType}/:vnum returns 403`, async () => {
        const res = await authRequest(
          app,
          `/api/publish/${entityType}/${vnum}`,
          testCookie,
          { method: "POST" },
        );
        expect(res.status).toBe(403);
      });
    }

    test("POST /api/publish/bulk returns 403", async () => {
      const res = await authRequest(app, "/api/publish/bulk", testCookie, {
        body: JSON.stringify({
          entities: [
            { ownerPlayerId: otherUser.playerId, type: "room", vnum: 100 },
          ],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      expect(res.status).toBe(403);
    });

    test("GET /api/publish/dashboard returns 403", async () => {
      const res = await authRequest(app, "/api/publish/dashboard", testCookie);
      expect(res.status).toBe(403);
    });
  });

  describe("standard builder can access diff endpoints", () => {
    const entityTypes = ["rooms", "mobs", "objects"] as const;
    for (const entityType of entityTypes) {
      test(`GET /api/publish/diff/${entityType}/:vnum returns 200`, async () => {
        const res = await authRequest(
          app,
          `/api/publish/diff/${entityType}/100`,
          testCookie,
        );
        expect(res.status).toBe(200);
        const body: unknown = await res.json();
        expect(body).toHaveProperty("immortal");
        expect(body).toHaveProperty("production");
      });
    }
  });

  describe("diff respects vnum access", () => {
    test("standard builder blocked from vnums outside blocks", async () => {
      const res = await authRequest(
        app,
        "/api/publish/diff/rooms/500",
        testCookie,
      );
      expect(res.status).toBe(403);
    });

    test("senior builder can diff any vnum", async () => {
      const res = await authRequest(
        app,
        "/api/publish/diff/rooms/100",
        expandedCookie,
      );
      expect(res.status).toBe(200);
    });
  });

  describe("no-blocks user", () => {
    test("diff returns 403 (no vnums accessible)", async () => {
      const res = await authRequest(
        app,
        "/api/publish/diff/rooms/100",
        noBlocksCookie,
      );
      expect(res.status).toBe(403);
    });

    test("publish returns 403 (no POWER_LOW)", async () => {
      const res = await authRequest(
        app,
        "/api/publish/rooms/100",
        noBlocksCookie,
        { method: "POST" },
      );
      expect(res.status).toBe(403);
    });

    test("dashboard returns 403 (no POWER_LOW)", async () => {
      const res = await authRequest(
        app,
        "/api/publish/dashboard",
        noBlocksCookie,
      );
      expect(res.status).toBe(403);
    });
  });
});

describe("publish auth enforcement", () => {
  test("unauthenticated POST /api/publish/rooms/:vnum returns 401", async () => {
    const res = await app.request("/api/publish/rooms/100", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  test("unauthenticated POST /api/publish/bulk returns 401", async () => {
    const res = await app.request("/api/publish/bulk", {
      body: JSON.stringify({ entities: [] }),
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  test("unauthenticated POST /api/publish/mob-responses/:vnum returns 401", async () => {
    const res = await app.request("/api/publish/mob-responses/100", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});

describe("diff endpoints", () => {
  beforeAll(async () => {
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "Diff Test Room" }),
      vnum: VNUMS.DIFF_ROOM,
    });
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload({
        name: "diff mob",
        short_desc: "a diff mob",
      }),
      vnum: VNUMS.DIFF_MOB,
    });
    return createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "objects",
      updatePayload: validObjPayload({
        name: "diff object",
        short_desc: "a diff object",
      }),
      vnum: VNUMS.DIFF_OBJ,
    });
  });

  const newEntityCases = [
    {
      entityType: "rooms",
      expectedName: "Diff Test Room",
      schema: roomSchema,
      vnum: VNUMS.DIFF_ROOM,
    },
    {
      entityType: "mobs",
      expectedName: "diff mob",
      schema: mobSchema,
      vnum: VNUMS.DIFF_MOB,
    },
    {
      entityType: "objects",
      expectedName: "diff object",
      schema: objSchema,
      vnum: VNUMS.DIFF_OBJ,
    },
  ] as const;
  for (const { entityType, expectedName, schema, vnum } of newEntityCases) {
    test(`${entityType}: diff returns immortal data and null production for new entity`, async () => {
      const res = await authRequest(
        app,
        `/api/publish/diff/${entityType}/${vnum}`,
        lowOnlyCookie,
      );
      expect(res.status).toBe(200);
      const body: unknown = await res.json();

      expect(body).toHaveProperty(
        "immortal",
        expect.objectContaining({ name: expectedName }),
      );
      expect(body).toHaveProperty("production", null);
      const diffBody = z.object({ immortal: z.unknown() }).parse(body);
      expect(diffBody.immortal).not.toBeNull();
      schema.parse(diffBody.immortal);
    });
  }

  test("returns both versions after publishing", async () => {
    const pubRes = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.DIFF_ROOM}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(pubRes.status).toBe(200);

    const res = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.DIFF_ROOM}`,
      lowOnlyCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toHaveProperty(
      "immortal",
      expect.objectContaining({ name: "Diff Test Room" }),
    );
    expect(body).toHaveProperty(
      "production",
      expect.objectContaining({ name: "Diff Test Room" }),
    );
  });

  test("returns null immortal when entity does not exist", async () => {
    // Vnum 398 is within lowOnlyUser's blocks but not created
    const res = await authRequest(
      app,
      "/api/publish/diff/rooms/398",
      lowOnlyCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toHaveProperty("immortal", null);
    expect(body).toHaveProperty("production", null);
  });
});

describe("single entity publish", () => {
  beforeAll(async () => {
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({
        exits: [
          {
            block: 1,
            condition_flag: 0,
            description: "A passage north.",
            destination: VNUMS.PUB_ROOM,
            direction: 0,
            key_num: -1,
            lock_difficulty: 0,
            name: "north",
            type: 1,
            vnum: VNUMS.PUB_ROOM,
            weight: 0,
          },
        ],
        extras: [
          {
            description: "You see carvings on the wall.",
            name: "wall carving",
            vnum: VNUMS.PUB_ROOM,
          },
        ],
        name: "Published Room",
      }),
      vnum: VNUMS.PUB_ROOM,
    });

    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload({
        extras: [
          {
            description: "The guard is battle-scarred.",
            keyword: "bamfin",
            vnum: VNUMS.PUB_MOB,
          },
        ],
        immunities: [{ amt: 100, type: 1, vnum: VNUMS.PUB_MOB }],
        name: "published guard",
        short_desc: "a published guard",
      }),
      vnum: VNUMS.PUB_MOB,
    });

    return createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "objects",
      updatePayload: validObjPayload({
        affects: [{ mod1: 5, mod2: 0, type: 18, vnum: VNUMS.PUB_OBJ }],
        extras: [
          {
            description: "Runes glow faintly.",
            name: "runes glow",
            vnum: VNUMS.PUB_OBJ,
          },
        ],
        name: "published sword",
        short_desc: "a published sword",
      }),
      vnum: VNUMS.PUB_OBJ,
    });
  });

  test("publish room creates correct data in sneezy", async () => {
    const res = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.PUB_ROOM}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.PUB_ROOM}`,
      lowOnlyCookie,
    );
    const diff: unknown = await diffRes.json();

    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "Published Room" }),
    );
    expect(diff).toHaveProperty(
      "production.exits",
      expect.arrayContaining([
        expect.objectContaining({ destination: VNUMS.PUB_ROOM, direction: 0 }),
      ]),
    );
    expect(diff).toHaveProperty(
      "production.extras",
      expect.arrayContaining([
        expect.objectContaining({ name: "wall carving" }),
      ]),
    );
  });

  test("publish mob creates correct data in sneezy", async () => {
    const res = await authRequest(
      app,
      `/api/publish/mobs/${VNUMS.PUB_MOB}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/mobs/${VNUMS.PUB_MOB}`,
      lowOnlyCookie,
    );
    const diff: unknown = await diffRes.json();

    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "published guard" }),
    );
    expect(diff).toHaveProperty(
      "production.extras",
      expect.arrayContaining([expect.objectContaining({ keyword: "bamfin" })]),
    );
    expect(diff).toHaveProperty(
      "production.immunities",
      expect.arrayContaining([expect.objectContaining({ amt: 100, type: 1 })]),
    );
  });

  test("publish object creates correct data in sneezy", async () => {
    const res = await authRequest(
      app,
      `/api/publish/objects/${VNUMS.PUB_OBJ}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/objects/${VNUMS.PUB_OBJ}`,
      lowOnlyCookie,
    );
    const diff: unknown = await diffRes.json();

    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "published sword" }),
    );
    expect(diff).toHaveProperty(
      "production.affects",
      expect.arrayContaining([expect.objectContaining({ mod1: 5, type: 18 })]),
    );
    expect(diff).toHaveProperty(
      "production.extras",
      expect.arrayContaining([expect.objectContaining({ name: "runes glow" })]),
    );
  });

  test("publish returns 404 when entity does not exist in immortal", async () => {
    // lowOnlyUser is senior, so vnum access checks pass even outside their
    // assigned blocks. The entity at MISSING_ROOM is never created, so the
    // publish call should hit the not-found branch and return 404.
    const res = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.MISSING_ROOM}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(404);
  });

  test("republish is idempotent", async () => {
    const res = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.PUB_ROOM}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.PUB_ROOM}`,
      lowOnlyCookie,
    );
    const diff: unknown = await diffRes.json();

    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "Published Room" }),
    );
    expect(diff).toHaveProperty("production.exits", [
      expect.objectContaining({ destination: VNUMS.PUB_ROOM, direction: 0 }),
    ]);
    expect(diff).toHaveProperty("production.extras", [
      expect.objectContaining({ name: "wall carving" }),
    ]);
  });
});

describe("senior bypass on publish", () => {
  beforeAll(() =>
    createAndUpdate({
      app,
      cookie: expandedCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "Expanded Publish Room" }),
      vnum: VNUMS.EXPANDED_ROOM,
    }),
  );

  test("expanded user can publish", async () => {
    const res = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.EXPANDED_ROOM}`,
      expandedCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.EXPANDED_ROOM}`,
      expandedCookie,
    );
    const diff: unknown = await diffRes.json();
    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "Expanded Publish Room" }),
    );
  });

  test("expanded user can create and publish outside own blocks", async () => {
    await createAndUpdate({
      app,
      cookie: expandedCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "Out-of-Block Room" }),
      vnum: VNUMS.VNUM_ACCESS_ROOM,
    });

    const res = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.VNUM_ACCESS_ROOM}`,
      expandedCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.VNUM_ACCESS_ROOM}`,
      expandedCookie,
    );
    const diff: unknown = await diffRes.json();
    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "Out-of-Block Room" }),
    );
  });
});

describe("bulk publish", () => {
  beforeAll(async () => {
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "Bulk Room" }),
      vnum: VNUMS.PUB_BULK_ROOM,
    });
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload({
        name: "bulk mob",
        short_desc: "a bulk mob",
      }),
      vnum: VNUMS.PUB_BULK_MOB,
    });
    return createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "objects",
      updatePayload: validObjPayload({
        name: "bulk object",
        short_desc: "a bulk object",
      }),
      vnum: VNUMS.PUB_BULK_OBJ,
    });
  });

  test("publishes all entities in single request", async () => {
    const res = await authRequest(app, "/api/publish/bulk", lowOnlyCookie, {
      body: JSON.stringify({
        entities: [
          {
            ownerPlayerId: lowOnlyUser.playerId,
            type: "room",
            vnum: VNUMS.PUB_BULK_ROOM,
          },
          {
            ownerPlayerId: lowOnlyUser.playerId,
            type: "mob",
            vnum: VNUMS.PUB_BULK_MOB,
          },
          {
            ownerPlayerId: lowOnlyUser.playerId,
            type: "object",
            vnum: VNUMS.PUB_BULK_OBJ,
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });

    const roomDiffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.PUB_BULK_ROOM}`,
      lowOnlyCookie,
    );
    const mobDiffRes = await authRequest(
      app,
      `/api/publish/diff/mobs/${VNUMS.PUB_BULK_MOB}`,
      lowOnlyCookie,
    );
    const objDiffRes = await authRequest(
      app,
      `/api/publish/diff/objects/${VNUMS.PUB_BULK_OBJ}`,
      lowOnlyCookie,
    );

    const roomDiff: unknown = await roomDiffRes.json();
    const mobDiff: unknown = await mobDiffRes.json();
    const objDiff: unknown = await objDiffRes.json();

    expect(roomDiff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "Bulk Room" }),
    );
    expect(mobDiff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "bulk mob" }),
    );
    expect(objDiff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "bulk object" }),
    );
  });

  test("standard builder gets 403 on bulk publish (no POWER_LOW)", async () => {
    const res = await authRequest(app, "/api/publish/bulk", testCookie, {
      body: JSON.stringify({
        entities: [
          { ownerPlayerId: otherUser.playerId, type: "room", vnum: 100 },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(403);
  });

  test("invalid body is rejected by validation", async () => {
    const res = await authRequest(app, "/api/publish/bulk", lowOnlyCookie, {
      body: JSON.stringify({ entities: "not-an-array" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(400);
  });

  test("rolls back the entire batch when one entity is missing in immortal", async () => {
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "Rollback Test Room" }),
      vnum: VNUMS.BULK_ROLLBACK_ROOM,
    });

    // Bulk publish: include the new room AND a missing vnum that triggers
    // the not-found path. The transaction should roll back so the new room
    // never lands in sneezy.
    const res = await authRequest(app, "/api/publish/bulk", lowOnlyCookie, {
      body: JSON.stringify({
        entities: [
          {
            ownerPlayerId: lowOnlyUser.playerId,
            type: "room",
            vnum: VNUMS.BULK_ROLLBACK_ROOM,
          },
          {
            ownerPlayerId: lowOnlyUser.playerId,
            type: "room",
            vnum: VNUMS.MISSING_ROOM,
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(404);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.BULK_ROLLBACK_ROOM}`,
      lowOnlyCookie,
    );
    const diff: unknown = await diffRes.json();
    expect(diff).toHaveProperty("production", null);
  });
});

describe("publish edge cases", () => {
  test("publishes entity with empty child collections without leaving orphans", async () => {
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "Empty Children Room" }),
      vnum: VNUMS.EMPTY_CHILDREN_ROOM,
    });

    const pubRes = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.EMPTY_CHILDREN_ROOM}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(pubRes.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.EMPTY_CHILDREN_ROOM}`,
      lowOnlyCookie,
    );
    const diff: unknown = await diffRes.json();
    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({
        exits: [],
        extras: [],
        name: "Empty Children Room",
      }),
    );
  });
});

describe("mob response publish", () => {
  beforeAll(async () => {
    // Create a mob in immortal and publish it to sneezy so the FK from
    // sneezy.mobresponses -> sneezy.mob is satisfied when the response is published.
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload({
        name: "response mob",
        short_desc: "a response mob",
      }),
      vnum: VNUMS.RESPONSE_MOB,
    });
    const pubMobRes = await authRequest(
      app,
      `/api/publish/mobs/${VNUMS.RESPONSE_MOB}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    if (pubMobRes.status !== 200) {
      throw new Error(
        `mob publish setup failed (${pubMobRes.status}): ${await pubMobRes.text()}`,
      );
    }

    // Set the mob's response via the existing mob-responses PUT endpoint.
    // If this fails the per-test setup is broken; throw rather than expect()
    // to keep linting happy (no expect outside test blocks).
    const putRes = await authRequest(
      app,
      `/api/mob-responses/${VNUMS.RESPONSE_MOB}`,
      lowOnlyCookie,
      {
        body: JSON.stringify({
          response: 'say {"hello"; smile %n;}',
          vnum: VNUMS.RESPONSE_MOB,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    if (putRes.status !== 200) {
      throw new Error(
        `mob-response setup failed (${putRes.status}): ${await putRes.text()}`,
      );
    }
  });

  test("publishing a mob response writes it to sneezy", async () => {
    const res = await authRequest(
      app,
      `/api/publish/mob-responses/${VNUMS.RESPONSE_MOB}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const diffRes = await authRequest(
      app,
      `/api/publish/diff/mob-responses/${VNUMS.RESPONSE_MOB}`,
      lowOnlyCookie,
    );
    expect(diffRes.status).toBe(200);
    const diff: unknown = await diffRes.json();
    expect(diff).toHaveProperty(
      "immortal",
      expect.objectContaining({
        response: 'say {"hello"; smile %n;}',
        vnum: VNUMS.RESPONSE_MOB,
      }),
    );
    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({
        response: 'say {"hello"; smile %n;}',
        vnum: VNUMS.RESPONSE_MOB,
      }),
    );
  });

  test("publishing a missing mob response returns 404", async () => {
    // 397 is within lowOnlyUser's blocks but no response exists for it
    const res = await authRequest(
      app,
      "/api/publish/mob-responses/397",
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(404);
  });

  test("publishing a mob response whose parent mob is unpublished returns 422", async () => {
    // Create a mob and its response in immortal, but do NOT publish the mob.
    // This exercises the single-entity route's MobResponseMissingParentError
    // branch (paralleling the bulk route path covered by TEST-OWNER-10).
    const vnum = VNUMS.SINGLE_ORPHAN_MR;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload(),
      vnum,
    });
    const putRes = await authRequest(
      app,
      `/api/mob-responses/${vnum}`,
      lowOnlyCookie,
      {
        body: JSON.stringify({ response: "say {hi;}", vnum }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(putRes.status).toBe(200);

    const res = await authRequest(
      app,
      `/api/publish/mob-responses/${vnum}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(422);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", expect.stringContaining(String(vnum)));
    expect(await getSneezyMobResponse(vnum)).toBeNull();
  });
});

describe("dashboard", () => {
  test("lowOnlyUser sees unpublished entities as new", async () => {
    // DIFF_MOB and DIFF_OBJ were created in the diff tests but never published
    const res = await authRequest(app, "/api/publish/dashboard", lowOnlyCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "new",
          type: "mob",
          vnum: VNUMS.DIFF_MOB,
        }),
        expect.objectContaining({
          status: "new",
          type: "object",
          vnum: VNUMS.DIFF_OBJ,
        }),
      ]),
    );

    if (!Array.isArray(body)) throw new Error("expected array");
    for (const entry of body) {
      expect(entry).toHaveProperty("owner");
      expect(entry).toHaveProperty("name");
    }
  });

  test("expandedUser can view all owners' entities", async () => {
    const res = await authRequest(
      app,
      "/api/publish/dashboard?owner=all",
      expandedCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    // Should include lowOnlyUser's unpublished entities since expandedUser
    // is senior and requested owner=all
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vnum: VNUMS.DIFF_MOB }),
      ]),
    );
  });

  test("senior owner=all returns superset of own entities", async () => {
    const ownRes = await authRequest(
      app,
      "/api/publish/dashboard",
      lowOnlyCookie,
    );
    const allRes = await authRequest(
      app,
      "/api/publish/dashboard?owner=all",
      lowOnlyCookie,
    );
    expect(ownRes.status).toBe(200);
    expect(allRes.status).toBe(200);

    const ownBody: unknown = await ownRes.json();
    const allBody: unknown = await allRes.json();

    if (!Array.isArray(ownBody) || !Array.isArray(allBody))
      throw new Error("expected arrays");

    // lowOnlyUser is senior, so owner=all should return >= own results
    expect(allBody.length).toBeGreaterThanOrEqual(ownBody.length);
  });

  test("entities have owner name resolved", async () => {
    const res = await authRequest(app, "/api/publish/dashboard", lowOnlyCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    if (!Array.isArray(body)) throw new Error("expected array");

    for (const entity of body) {
      expect(entity).toHaveProperty("owner", expect.any(String));
    }
  });

  test("dashboard reports modified when only a child row changes", async () => {
    // Regression for I3: the prior JSON.stringify-based comparison only
    // looked at parent rows, so adding/changing an exit, extra, immunity, or
    // affect went undetected and the builder got no signal to publish.
    const ROOM = VNUMS.CHILD_MOD_ROOM;

    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "Child-Mod Test Room" }),
      vnum: ROOM,
    });

    const pubRes = await authRequest(
      app,
      `/api/publish/rooms/${ROOM}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(pubRes.status).toBe(200);

    // Just-published room with no children should not appear in the dashboard
    const beforeRes = await authRequest(
      app,
      "/api/publish/dashboard",
      lowOnlyCookie,
    );
    const beforeBody: unknown = await beforeRes.json();
    expect(beforeBody).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: ROOM })]),
    );

    // Insert a child row directly into immortal so the parent row stays
    // byte-identical to sneezy. Only the child set differs.
    await immortalDb.execute(sql`
      INSERT INTO roomexit
        (vnum, player_id, direction, destination, name, condition_flag, type, key_num, lock_difficulty, weight, description)
      VALUES
        (${ROOM}, 99995, 0, 200, 'north', 0, 1, -1, 0, 0, '')
    `);

    const afterRes = await authRequest(
      app,
      "/api/publish/dashboard",
      lowOnlyCookie,
    );
    const afterBody: unknown = await afterRes.json();
    expect(afterBody).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "modified",
          type: "room",
          vnum: ROOM,
        }),
      ]),
    );
  });

  test("dashboard entities include playerId", async () => {
    const res = await authRequest(app, "/api/publish/dashboard", lowOnlyCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    if (!Array.isArray(body)) throw new Error("expected array");
    expect(body.length).toBeGreaterThan(0);

    // Every entity should carry a numeric playerId alongside the resolved
    // owner name. This verifies the route handler stopped stripping it.
    for (const entity of body) {
      expect(entity).toHaveProperty("playerId", expect.any(Number));
      expect(entity).toHaveProperty("owner", expect.any(String));
    }
  });

  test("senior ?owner=<playerId> returns only that builder's drafts", async () => {
    // testUser creates a draft in their own block; lowOnlyUser (senior) then
    // targets that specific playerId via ?owner=. This exercises the
    // resolveListOwner specific-number branch, which is distinct from the
    // owner=all branch (scope: "all") and the own-draft branch (scope: caller).
    const vnum = VNUMS.DASHBOARD_OWNER_ROOM;
    await createAndUpdate({
      app,
      cookie: testCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({
        name: "testUser owner-filter draft",
      }),
      vnum,
    });

    const res = await authRequest(
      app,
      `/api/publish/dashboard?owner=${testUser.playerId}`,
      lowOnlyCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: testUser.playerId,
          status: "new",
          type: "room",
          vnum,
        }),
      ]),
    );

    // Every returned entry is scoped to the targeted playerId - no leakage
    // of the caller's own drafts (e.g. DIFF_MOB) or other builders'.
    if (!Array.isArray(body)) throw new Error("expected array");
    for (const entry of body) {
      expect(entry).toHaveProperty("playerId", testUser.playerId);
    }
  });

  test("mob responses appear in dashboard", async () => {
    // RESPONSE_MOB was created and given a mob response in the
    // "mob response publish" describe block's beforeAll. The response was
    // also published, so if it matches production it won't appear. We need
    // a mob response that differs from production or doesn't exist there.
    // Insert a fresh mob response directly to guarantee it appears as "new".
    const RESP_VNUM = VNUMS.DIFF_MOB;

    // DIFF_MOB exists in immortal (created in diff tests) but was never
    // published. Insert a mob response for it in immortal.
    await immortalDb.execute(sql`
      INSERT INTO mobresponses (vnum, player_id, response)
      VALUES (${RESP_VNUM}, 99995, 'say {"dashboard test";}')
      ON DUPLICATE KEY UPDATE response = 'say {"dashboard test";}'
    `);

    const res = await authRequest(app, "/api/publish/dashboard", lowOnlyCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "new",
          type: "mob-response",
          vnum: RESP_VNUM,
        }),
      ]),
    );
  });

  test("senior with no entities gets 200 and empty array", async () => {
    // noLimitsOnlyUser (senior, blocks 90100-90199) creates no drafts in any
    // test file. The dashboard query must return an empty array rather than
    // erroring when the scoped immortal tables match zero rows.
    const noLimitsCookie = await getAuthCookie(app, "nolimitsonly");
    const res = await authRequest(
      app,
      "/api/publish/dashboard",
      noLimitsCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });
});

describe("cross-owner publish", () => {
  test("TEST-1a: expandedUser publishes lowOnlyUser's room via ?owner=", async () => {
    const vnum = VNUMS.CROSS_OWNER_PUBLISH_ROOM;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "content A" }),
      vnum,
    });
    const res = await authRequest(
      app,
      `/api/publish/rooms/${vnum}?owner=${lowOnlyUser.playerId}`,
      expandedCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
    const diffRes = await authRequest(
      app,
      `/api/publish/diff/rooms/${vnum}?owner=${lowOnlyUser.playerId}`,
      expandedCookie,
    );
    expect(diffRes.status).toBe(200);
    const diff: unknown = await diffRes.json();
    expect(diff).toHaveProperty(
      "production",
      expect.objectContaining({ name: "content A" }),
    );
  });

  test("TEST-1c: non-senior caller with ?owner=<other> gets 403", async () => {
    const res = await authRequest(
      app,
      `/api/publish/rooms/${VNUMS.CROSS_OWNER_PUBLISH_ROOM}?owner=${lowOnlyUser.playerId}`,
      testCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(403);
  });

  test("TEST-1b: cross-owner publish targets other builder when senior also has draft", async () => {
    const vnum = VNUMS.CROSS_OWNER_CALLER_DRAFT;
    await createAndUpdate({
      app,
      cookie: testCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "testUser content" }),
      vnum,
    });
    await createAndUpdate({
      app,
      cookie: expandedCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "expanded content" }),
      vnum,
    });
    const pubRes = await authRequest(
      app,
      `/api/publish/rooms/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
      { method: "POST" },
    );
    expect(pubRes.status).toBe(200);
    // Verify sneezy has testUser's content, not expanded's
    const [sneezyRow] = await sneezyDb
      .select({ name: sneezyRoom.name })
      .from(sneezyRoom)
      .where(eq(sneezyRoom.vnum, vnum));
    expect(sneezyRow?.name).toBe("testUser content");
  });

  test("TEST-1d: absent ?owner= uses caller's own draft", async () => {
    const vnum = VNUMS.CROSS_OWNER_PUBLISH_MOB;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload({
        name: "my mob",
        short_desc: "a mob",
      }),
      vnum,
    });
    const res = await authRequest(
      app,
      `/api/publish/mobs/${vnum}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
  });

  test("TEST-1e: noLimitsOnlyUser publishes another builder's draft", async () => {
    const vnum = VNUMS.NO_LIMITS_PUBLISH;
    await createAndUpdate({
      app,
      cookie: testCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "for no-limits" }),
      vnum,
    });
    const noLimitsCookie = await getAuthCookie(app, "nolimitsonly");
    const pubRes = await authRequest(
      app,
      `/api/publish/rooms/${vnum}?owner=${testUser.playerId}`,
      noLimitsCookie,
      { method: "POST" },
    );
    expect(pubRes.status).toBe(200);
  });
});

describe("cross-owner bulk publish", () => {
  test("TEST-OWNER-7: bulk publish - senior publishes mixed-owner entities", async () => {
    const vnumA = VNUMS.BULK_XO_A;
    const vnumB = VNUMS.BULK_XO_B;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "draft A" }),
      vnum: vnumA,
    });
    await createAndUpdate({
      app,
      cookie: expandedCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "draft B" }),
      vnum: vnumB,
    });

    const res = await authRequest(app, "/api/publish/bulk", expandedCookie, {
      body: JSON.stringify({
        entities: [
          { ownerPlayerId: lowOnlyUser.playerId, type: "room", vnum: vnumA },
          { ownerPlayerId: expandedUser.playerId, type: "room", vnum: vnumB },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(200);

    const snzA = await getSneezyRoom(vnumA);
    const snzB = await getSneezyRoom(vnumB);
    expect(snzA?.name).toBe("draft A");
    expect(snzB?.name).toBe("draft B");
  });

  test("TEST-WRONG-OWNER-BULK: non-senior targeting another owner is rejected", async () => {
    const res = await authRequest(app, "/api/publish/bulk", testCookie, {
      body: JSON.stringify({
        entities: [
          { ownerPlayerId: otherUser.playerId, type: "room", vnum: 101 },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    // testUser is not senior (lacks POWER_LOW). Also lacks POWER_LOW which
    // requirePower(POWER.LOW) would trip first with 403.
    expect(res.status).toBe(403);
  });

  test("TEST-OWNER-9: bulk publish reorders mob-response after mob", async () => {
    // User submits mob-response BEFORE mob. Server must reorder.
    const vnum = VNUMS.BULK_REORDER_MOB;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload({ name: "reorder target" }),
      vnum,
    });
    const putRes = await authRequest(
      app,
      `/api/mob-responses/${vnum}`,
      lowOnlyCookie,
      {
        body: JSON.stringify({ response: 'say {"hi";}', vnum }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(putRes.status).toBe(200);

    // Sneezy has neither yet. Submit mob-response BEFORE mob in payload.
    const res = await authRequest(app, "/api/publish/bulk", lowOnlyCookie, {
      body: JSON.stringify({
        entities: [
          {
            ownerPlayerId: lowOnlyUser.playerId,
            type: "mob-response",
            vnum,
          },
          { ownerPlayerId: lowOnlyUser.playerId, type: "mob", vnum },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(200);
    expect(await getSneezyMob(vnum)).not.toBeNull();
    expect(await getSneezyMobResponse(vnum)).not.toBeNull();
  });

  test("TEST-OWNER-10: bulk publish orphan mob-response returns 422 with rollback", async () => {
    const vnum = VNUMS.BULK_ORPHAN_MR;
    // Create a mob and mob-response in immortal, but do NOT publish the mob
    // to sneezy. The mob-response will reference a vnum with no sneezy parent.
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload(),
      vnum,
    });
    const putRes = await authRequest(
      app,
      `/api/mob-responses/${vnum}`,
      lowOnlyCookie,
      {
        body: JSON.stringify({ response: "say {hi;}", vnum }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(putRes.status).toBe(200);

    // Submit ONLY the mob-response (not the mob) for publish. Parent-existence
    // check in publishMobResponseTx must fail.
    const res = await authRequest(app, "/api/publish/bulk", lowOnlyCookie, {
      body: JSON.stringify({
        entities: [
          {
            ownerPlayerId: lowOnlyUser.playerId,
            type: "mob-response",
            vnum,
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(422);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", expect.stringContaining(String(vnum)));
    expect(await getSneezyMobResponse(vnum)).toBeNull();
  });
});

describe("constraint error handling", () => {
  test("TEST-B-M5: publishing a room with exit to missing destination returns 422", async () => {
    const vnum = VNUMS.CONSTRAINT_ERROR_ROOM;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({
        exits: [
          {
            block: null,
            condition_flag: 0,
            description: "",
            destination: 49_999, // does not exist in sneezy
            direction: 0,
            key_num: -1,
            lock_difficulty: 0,
            name: "north",
            type: 1,
            vnum,
            weight: 0,
          },
        ],
      }),
      vnum,
    });
    const res = await authRequest(
      app,
      `/api/publish/rooms/${vnum}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(422);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error");
  });
});

describe("publish 404 for missing entities", () => {
  test("TEST-6a: POST /api/publish/mobs/:vnum returns 404 for nonexistent vnum", async () => {
    const res = await authRequest(app, "/api/publish/mobs/399", lowOnlyCookie, {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });

  test("TEST-6b: POST /api/publish/objects/:vnum returns 404 for nonexistent vnum", async () => {
    const res = await authRequest(
      app,
      "/api/publish/objects/399",
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(404);
  });
});

test("TEST-7: POST /api/publish/mob-responses/:vnum returns 403 without POWER_LOW", async () => {
  const res = await authRequest(
    app,
    "/api/publish/mob-responses/100",
    testCookie,
    { method: "POST" },
  );
  expect(res.status).toBe(403);
});

describe("publish with empty children", () => {
  test("TEST-8: mob with empty immunities/extras publishes cleanly", async () => {
    const vnum = VNUMS.EMPTY_CHILDREN_ROOM + 100; // 516, in lowOnlyUser's 500-599
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload(),
      vnum,
    });

    const res = await authRequest(
      app,
      `/api/publish/mobs/${vnum}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const snzMob = await getSneezyMob(vnum);
    expect(snzMob).not.toBeNull();
    expect(snzMob?.extras).toEqual([]);
    expect(snzMob?.immunities).toEqual([]);
  });

  test("TEST-8: object with empty affects/extras publishes cleanly", async () => {
    const vnum = VNUMS.EMPTY_CHILDREN_ROOM + 101; // 517, in lowOnlyUser's 500-599
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "objects",
      updatePayload: validObjPayload(),
      vnum,
    });

    const res = await authRequest(
      app,
      `/api/publish/objects/${vnum}`,
      lowOnlyCookie,
      { method: "POST" },
    );
    expect(res.status).toBe(200);

    const snzObj = await getSneezyObject(vnum);
    expect(snzObj).not.toBeNull();
    expect(snzObj?.affects).toEqual([]);
    expect(snzObj?.extras).toEqual([]);
  });
});

test("TEST-200-LIMIT: bulk publish with 201 entities returns 400", async () => {
  const entities = Array.from({ length: 201 }, (_, i) => ({
    ownerPlayerId: lowOnlyUser.playerId,
    type: "room" as const,
    vnum: 300 + i,
  }));
  const res = await authRequest(app, "/api/publish/bulk", lowOnlyCookie, {
    body: JSON.stringify({ entities }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(res.status).toBe(400);
});

describe("scope integrity - immortal data unchanged after publish", () => {
  const cases = [
    {
      entityType: "rooms",
      payload: validRoomPayload({ name: "Scope Room" }),
      vnum: VNUMS.SCOPE_ROOM,
    },
    {
      entityType: "mobs",
      payload: validMobPayload({ name: "scope mob" }),
      vnum: VNUMS.SCOPE_MOB,
    },
    {
      entityType: "objects",
      payload: validObjPayload({ name: "scope object" }),
      vnum: VNUMS.SCOPE_OBJ,
    },
  ] as const;
  for (const { entityType, payload, vnum } of cases) {
    test(`${entityType}: immortal data survives publish round-trip`, async () => {
      await createAndUpdate({
        app,
        cookie: lowOnlyCookie,
        entityType,
        updatePayload: payload,
        vnum,
      });

      const beforeRes = await authRequest(
        app,
        `/api/${entityType}/${vnum}`,
        lowOnlyCookie,
      );
      const before: unknown = await beforeRes.json();

      await authRequest(
        app,
        `/api/publish/${entityType}/${vnum}`,
        lowOnlyCookie,
        { method: "POST" },
      );

      const afterRes = await authRequest(
        app,
        `/api/${entityType}/${vnum}`,
        lowOnlyCookie,
      );
      const after: unknown = await afterRes.json();

      expect(after).toEqual(before);
    });
  }
});

test("TEST-MOB-RESPONSE-PRESERVE: publishing mob preserves existing sneezy mobresponses", async () => {
  const vnum = VNUMS.PRESERVE_MR_MOB;
  await createAndUpdate({
    app,
    cookie: lowOnlyCookie,
    entityType: "mobs",
    updatePayload: validMobPayload(),
    vnum,
  });
  await authRequest(app, `/api/publish/mobs/${vnum}`, lowOnlyCookie, {
    method: "POST",
  });
  // Insert a mobresponse directly into sneezy (simulating in-game creation)
  await sneezyDb.execute(
    sql`INSERT INTO mobresponses (vnum, response) VALUES (${vnum}, 'sneezy-only text')`,
  );
  // Republish the mob - the mob response row should be untouched
  const republishRes = await authRequest(
    app,
    `/api/publish/mobs/${vnum}`,
    lowOnlyCookie,
    { method: "POST" },
  );
  expect(republishRes.status).toBe(200);
  const [sneezyRow] = await sneezyDb
    .select()
    .from(sneezyMobresponses)
    .where(eq(sneezyMobresponses.vnum, vnum));
  expect(sneezyRow?.response).toBe("sneezy-only text");
});

describe("permissive expansion for senior builders", () => {
  const cases = [
    { entityType: "rooms", vnum: VNUMS.PERMISSIVE_EXP_ROOM },
    { entityType: "mobs", vnum: VNUMS.PERMISSIVE_EXP_MOB },
    { entityType: "objects", vnum: VNUMS.PERMISSIVE_EXP_OBJ },
  ] as const;
  for (const { entityType, vnum } of cases) {
    test(`TEST-PERMISSIVE-EXPANSION: lowOnlyUser creates out-of-block ${entityType}`, async () => {
      const res = await authRequest(app, `/api/${entityType}`, lowOnlyCookie, {
        body: JSON.stringify({ vnum }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      expect(res.status).toBe(201);
    });
  }
});

describe("permissive deny for non-senior builders", () => {
  const cases = [
    { entityType: "rooms", vnum: VNUMS.PERMISSIVE_DENY_ROOM },
    { entityType: "mobs", vnum: VNUMS.PERMISSIVE_DENY_MOB },
    { entityType: "objects", vnum: VNUMS.PERMISSIVE_DENY_OBJ },
  ] as const;
  for (const { entityType, vnum } of cases) {
    test(`TEST-PERMISSIVE-DENY: testUser cannot create out-of-block ${entityType}`, async () => {
      const res = await authRequest(app, `/api/${entityType}`, testCookie, {
        body: JSON.stringify({ vnum }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      expect(res.status).toBe(403);
    });
  }
});

describe("create rejects owner query param", () => {
  const cases = [
    { entityType: "rooms", vnum: 265 },
    { entityType: "mobs", vnum: 266 },
    { entityType: "objects", vnum: 267 },
  ] as const;
  for (const { entityType, vnum } of cases) {
    test(`TEST-OWNER-CREATE-REJECT: POST /api/${entityType} rejects ?owner=`, async () => {
      const res = await authRequest(
        app,
        `/api/${entityType}?owner=${testUser.playerId}`,
        expandedCookie,
        {
          body: JSON.stringify({ vnum }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      expect(res.status).toBe(400);
    });
  }
});

// viewOnlyUser is senior (POWER.LOW) but lacks REDIT/RSAVE/EDIT.
// requireWritePower lets seniors bypass the power check on all methods,
// so viewOnlyUser can actually GET/POST/PUT/DELETE. The test verifies
// that GET works and that senior status bypasses write power checks.
describe("viewOnlyUser read-only API path", () => {
  test("TEST-2: viewOnlyUser GET rooms succeeds (senior, no edit powers)", async () => {
    const res = await authRequest(app, "/api/rooms", viewOnlyCookie);
    expect(res.status).toBe(200);
  });

  test("TEST-2: viewOnlyUser POST /api/rooms succeeds (senior bypasses write power)", async () => {
    const res = await authRequest(app, "/api/rooms", viewOnlyCookie, {
      body: JSON.stringify({ vnum: 90_050 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    // Seniors bypass requireWritePower and vnum block checks
    expect(res.status).toBe(201);
  });
});

test("TEST-DECIMAL: decimal precision round-trip for mob fields", async () => {
  const vnum = VNUMS.DECIMAL_MOB;
  await createAndUpdate({
    app,
    cookie: lowOnlyCookie,
    entityType: "mobs",
    updatePayload: validMobPayload({
      ac: 12.5,
      attacks: 2.3,
      damage_level: 7.8,
      hpbonus: 99.9,
      name: "decimal mob",
    }),
    vnum,
  });

  await authRequest(app, `/api/publish/mobs/${vnum}`, lowOnlyCookie, {
    method: "POST",
  });

  const snzMob = await getSneezyMob(vnum);
  expect(snzMob).not.toBeNull();
  expect(snzMob?.ac).toBe(12.5);
  expect(snzMob?.attacks).toBe(2.3);
  expect(snzMob?.damage_level).toBe(7.8);
  expect(snzMob?.hpbonus).toBe(99.9);
});

describe("deep round-trip with children", () => {
  test("room: all fields and children survive publish", async () => {
    const vnum = VNUMS.DEEP_RT_ROOM;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({
        exits: [
          {
            block: 1,
            condition_flag: 0,
            description: "A passage north.",
            destination: vnum,
            direction: 0,
            key_num: -1,
            lock_difficulty: 0,
            name: "north",
            type: 1,
            vnum,
            weight: 0,
          },
        ],
        extras: [
          {
            description: "Faded runes.",
            name: "runes",
            vnum,
          },
        ],
        name: "Deep RT Room",
      }),
      vnum,
    });

    await authRequest(app, `/api/publish/rooms/${vnum}`, lowOnlyCookie, {
      method: "POST",
    });

    const snzRoom = await getSneezyRoom(vnum);
    expect(snzRoom).not.toBeNull();
    expect(snzRoom).toHaveProperty("name", "Deep RT Room");
    expect(snzRoom).toHaveProperty(
      "exits",
      expect.arrayContaining([
        expect.objectContaining({ destination: vnum, direction: 0 }),
      ]),
    );
    expect(snzRoom).toHaveProperty(
      "extras",
      expect.arrayContaining([expect.objectContaining({ name: "runes" })]),
    );
  });

  test("mob: all fields and children survive publish", async () => {
    const vnum = VNUMS.DEEP_RT_MOB;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "mobs",
      updatePayload: validMobPayload({
        extras: [
          {
            description: "Battle-scarred guard.",
            keyword: "bamfin",
            vnum,
          },
        ],
        immunities: [{ amt: 50, type: 2, vnum }],
        name: "deep rt mob",
        short_desc: "a deep rt mob",
      }),
      vnum,
    });

    await authRequest(app, `/api/publish/mobs/${vnum}`, lowOnlyCookie, {
      method: "POST",
    });

    const snzMob = await getSneezyMob(vnum);
    expect(snzMob).not.toBeNull();
    expect(snzMob).toHaveProperty("name", "deep rt mob");
    expect(snzMob).toHaveProperty("short_desc", "a deep rt mob");
    expect(snzMob).toHaveProperty(
      "extras",
      expect.arrayContaining([expect.objectContaining({ keyword: "bamfin" })]),
    );
    expect(snzMob).toHaveProperty(
      "immunities",
      expect.arrayContaining([expect.objectContaining({ amt: 50, type: 2 })]),
    );
  });

  test("object: all fields and children survive publish", async () => {
    const vnum = VNUMS.DEEP_RT_OBJ;
    await createAndUpdate({
      app,
      cookie: lowOnlyCookie,
      entityType: "objects",
      updatePayload: validObjPayload({
        affects: [{ mod1: 10, mod2: 0, type: 18, vnum }],
        extras: [
          {
            description: "Glowing runes.",
            name: "runes glow",
            vnum,
          },
        ],
        name: "deep rt sword",
        short_desc: "a deep rt sword",
      }),
      vnum,
    });

    await authRequest(app, `/api/publish/objects/${vnum}`, lowOnlyCookie, {
      method: "POST",
    });

    const snzObj = await getSneezyObject(vnum);
    expect(snzObj).not.toBeNull();
    expect(snzObj).toHaveProperty("name", "deep rt sword");
    expect(snzObj).toHaveProperty("short_desc", "a deep rt sword");
    expect(snzObj).toHaveProperty(
      "affects",
      expect.arrayContaining([expect.objectContaining({ mod1: 10, type: 18 })]),
    );
    expect(snzObj).toHaveProperty(
      "extras",
      expect.arrayContaining([expect.objectContaining({ name: "runes glow" })]),
    );
  });
});

test("TEST-OWNER-2: dashboard multi-owner same-vnum keyed by (playerId, vnum)", async () => {
  const vnum = 150;
  const otherCookie = await getAuthCookie(app, "otherbuilder");
  await createAndUpdate({
    app,
    cookie: testCookie,
    entityType: "rooms",
    updatePayload: validRoomPayload({ name: "canonical" }),
    vnum,
  });
  const pubRes = await authRequest(
    app,
    `/api/publish/rooms/${vnum}?owner=${testUser.playerId}`,
    lowOnlyCookie,
    { method: "POST" },
  );
  expect(pubRes.status).toBe(200);
  await createAndUpdate({
    app,
    cookie: otherCookie,
    entityType: "rooms",
    updatePayload: validRoomPayload({ name: "MODIFIED" }),
    vnum,
  });
  const res = await authRequest(
    app,
    "/api/publish/dashboard?owner=all",
    expandedCookie,
  );
  expect(res.status).toBe(200);
  const body: unknown = await res.json();

  // testUser's room matches sneezy - should NOT appear
  expect(body).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        playerId: testUser.playerId,
        type: "room",
        vnum,
      }),
    ]),
  );
  // otherUser's room differs from sneezy - SHOULD appear
  expect(body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        playerId: otherUser.playerId,
        type: "room",
        vnum,
      }),
    ]),
  );
});

test("TEST-B-M3: dashboard treats null and empty-string as equal for nullable text fields", async () => {
  const vnum = VNUMS.NULL_NORMALIZE_MOB;
  await createAndUpdate({
    app,
    cookie: lowOnlyCookie,
    entityType: "mobs",
    updatePayload: validMobPayload({
      adjacent_sound: "",
      local_sound: "",
    }),
    vnum,
  });
  const pubRes = await authRequest(
    app,
    `/api/publish/mobs/${vnum}`,
    lowOnlyCookie,
    { method: "POST" },
  );
  expect(pubRes.status).toBe(200);
  const res = await authRequest(app, "/api/publish/dashboard", lowOnlyCookie);
  expect(res.status).toBe(200);
  const body: unknown = await res.json();

  // Null vs empty-string should be treated as equal - no dashboard entry
  expect(body).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ type: "mob", vnum })]),
  );
});

describe("unauthenticated access returns 401", () => {
  const routeFamilies = [
    "/api/publish/dashboard",
    "/api/rooms",
    "/api/mobs",
    "/api/objects",
    "/api/mob-responses/100",
  ];
  for (const route of routeFamilies) {
    test(`TEST-AUTH-401 ${route} returns 401 without auth cookie`, async () => {
      const res = await app.request(route, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      expect(res.status).toBe(401);
    });
  }
});
