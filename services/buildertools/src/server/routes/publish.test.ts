import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb, sneezyDb } from "../db.ts";
import {
  authRequest,
  getAuthCookie,
  getExpandedAuthCookie,
  getLowOnlyAuthCookie,
  getNoBlocksAuthCookie,
} from "../test-helpers.ts";

// testUser: blocks 100-199, all builder powers, NOT senior (no POWER_LOW)
// expandedUser: blocks 200-299, POWER_LOW + NO_LIMITS, IS senior
// lowOnlyUser: blocks 300-399 + 500-599, POWER_LOW, IS senior
// noBlocksUser: no blocks, POWER_BUILDER only, NOT senior
let testCookie: string;
let expandedCookie: string;
let lowOnlyCookie: string;
let noBlocksCookie: string;

beforeAll(async () => {
  [testCookie, expandedCookie, lowOnlyCookie, noBlocksCookie] =
    await Promise.all([
      getAuthCookie(app),
      getExpandedAuthCookie(app),
      getLowOnlyAuthCookie(app),
      getNoBlocksAuthCookie(app),
    ]);
});

// Vnums used across test groups - keep disjoint from other test files
const VNUMS = {
  DIFF_MOB: 400,
  DIFF_OBJ: 401,
  DIFF_ROOM: 402,
  EXPANDED_MOB: 250,
  EXPANDED_OBJ: 251,
  EXPANDED_ROOM: 252,
  PUB_BULK_MOB: 410,
  PUB_BULK_OBJ: 411,
  PUB_BULK_ROOM: 412,
  PUB_MOB: 403,
  PUB_OBJ: 404,
  PUB_ROOM: 405,
  VNUM_ACCESS_ROOM: 406,
};

afterAll(async () => {
  const allVnums = Object.values(VNUMS);

  // Clean up immortal_test
  for (const table of [
    "roomextra",
    "roomexit",
    "room",
    "mob_extra",
    "mob_imm",
    "mobresponses",
    "mob",
    "objaffect",
    "objextra",
    "obj",
  ]) {
    await immortalDb.execute(
      sql.raw(`DELETE FROM ${table} WHERE vnum IN (${allVnums.join(",")})`),
    );
  }

  // Clean up sneezy_test - publish writes here
  for (const table of [
    "roomexit",
    "roomextra",
    "room",
    "mob_extra",
    "mob_imm",
    "mobresponses",
    "mob",
    "objaffect",
    "objextra",
    "obj",
  ]) {
    await sneezyDb.execute(
      sql.raw(`DELETE FROM ${table} WHERE vnum IN (${allVnums.join(",")})`),
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validRoomUpdate = {
  capacity: 0,
  description: "A published room.",
  exits: [],
  extras: [],
  height: -1,
  name: "Test Publish Room",
  river_dir: 0,
  river_speed: 0,
  room_flag: 0,
  sector: 0,
  spec: 0,
  telelook: 0,
  teletarg: 0,
  teletime: 0,
  x: 0,
  y: 0,
  z: 0,
  zone: 1,
};

const validMobUpdate = {
  ac: 10,
  actions: 0,
  adjacent_sound: "",
  affects: 0,
  agi: 0,
  attacks: 1,
  bra: 0,
  can_be_seen: 0,
  cha: 0,
  class: 0,
  con: 0,
  damage_level: 0,
  damage_precision: 0,
  def_position: 9,
  description: "A published mob.",
  dex: 0,
  extras: [],
  fact_perc: 0,
  faction: 0,
  foc: 0,
  gold: 0,
  height: 0,
  hpbonus: 0,
  immunities: [],
  intel: 0,
  kar: 0,
  level: 1,
  local_sound: "",
  long_desc: "A published mob stands here.",
  max_exist: 0,
  name: "published mob",
  per: 0,
  race: 0,
  sex: 0,
  short_desc: "a published mob",
  skin: 0,
  spe: 0,
  spec_proc: 0,
  str: 0,
  tohit: 0,
  vision: 0,
  weight: 0,
  wis: 0,
};

const validObjUpdate = {
  action_desc: "",
  action_flag: 0,
  affects: [],
  can_be_seen: 0,
  cur_struct: 0,
  decay: 0,
  extras: [],
  long_desc: "",
  material: 0,
  max_exist: 0,
  max_struct: 0,
  name: "published object",
  price: 0,
  short_desc: "a published object",
  spec_proc: 0,
  type: 0,
  val0: 0,
  val1: 0,
  val2: 0,
  val3: 0,
  volume: 0,
  wear_flag: 0,
  weight: 0,
};

/** Create an entity in immortal via API and update it with full data. */
async function createAndUpdate(
  entityType: "mobs" | "objects" | "rooms",
  vnum: number,
  cookie: string,
  updatePayload: Record<string, unknown>,
) {
  const createRes = await authRequest(app, `/api/${entityType}`, cookie, {
    body: JSON.stringify({ vnum }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(createRes.status).toBe(201);

  const putRes = await authRequest(app, `/api/${entityType}/${vnum}`, cookie, {
    body: JSON.stringify({ ...updatePayload, vnum }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  expect(putRes.status).toBe(200);
}

// ===========================================================================
// Step 1: Permission model end-to-end
// ===========================================================================

describe("publish permission model", () => {
  // -- POWER_LOW required for publish and dashboard --

  describe("standard builder (testUser) lacks POWER_LOW", () => {
    test("POST /api/publish/rooms/:vnum returns 403", async () => {
      const res = await authRequest(
        app,
        `/api/publish/rooms/${VNUMS.PUB_ROOM}`,
        testCookie,
        { method: "POST" },
      );
      expect(res.status).toBe(403);
    });

    test("POST /api/publish/mobs/:vnum returns 403", async () => {
      const res = await authRequest(
        app,
        `/api/publish/mobs/${VNUMS.PUB_MOB}`,
        testCookie,
        { method: "POST" },
      );
      expect(res.status).toBe(403);
    });

    test("POST /api/publish/objects/:vnum returns 403", async () => {
      const res = await authRequest(
        app,
        `/api/publish/objects/${VNUMS.PUB_OBJ}`,
        testCookie,
        { method: "POST" },
      );
      expect(res.status).toBe(403);
    });

    test("POST /api/publish/bulk returns 403", async () => {
      const res = await authRequest(app, "/api/publish/bulk", testCookie, {
        body: JSON.stringify({ entities: [] }),
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

  // -- Diff endpoints are accessible to any authenticated builder --

  describe("standard builder can access diff endpoints", () => {
    test("GET /api/publish/diff/rooms/:vnum returns 200", async () => {
      const res = await authRequest(
        app,
        "/api/publish/diff/rooms/100",
        testCookie,
      );
      expect(res.status).toBe(200);
      const body: unknown = await res.json();
      expect(body).toHaveProperty("immortal");
      expect(body).toHaveProperty("production");
    });

    test("GET /api/publish/diff/mobs/:vnum returns 200", async () => {
      const res = await authRequest(
        app,
        "/api/publish/diff/mobs/100",
        testCookie,
      );
      expect(res.status).toBe(200);
    });

    test("GET /api/publish/diff/objects/:vnum returns 200", async () => {
      const res = await authRequest(
        app,
        "/api/publish/diff/objects/100",
        testCookie,
      );
      expect(res.status).toBe(200);
    });
  });

  // -- Diff respects vnum access for standard builders --

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

  // -- No-blocks user --

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

// ===========================================================================
// Step 2: Diff endpoints
// ===========================================================================

describe("diff endpoints", () => {
  beforeAll(async () => {
    // Create entities in immortal via lowOnlyUser (has POWER_LOW, blocks 300-399)
    await createAndUpdate("rooms", VNUMS.DIFF_ROOM, lowOnlyCookie, {
      ...validRoomUpdate,
      name: "Diff Test Room",
    });
    await createAndUpdate("mobs", VNUMS.DIFF_MOB, lowOnlyCookie, {
      ...validMobUpdate,
      name: "diff mob",
      short_desc: "a diff mob",
    });
    await createAndUpdate("objects", VNUMS.DIFF_OBJ, lowOnlyCookie, {
      ...validObjUpdate,
      name: "diff object",
      short_desc: "a diff object",
    });
  });

  test("returns immortal data and null production for new entity", async () => {
    const res = await authRequest(
      app,
      `/api/publish/diff/rooms/${VNUMS.DIFF_ROOM}`,
      lowOnlyCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toHaveProperty("immortal");
    expect(body).toHaveProperty("production", null);
    expect(body).toHaveProperty(
      "immortal",
      expect.objectContaining({ name: "Diff Test Room" }),
    );
  });

  test("returns both versions after publishing", async () => {
    // Publish the room first
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

  test("mob diff returns correct data", async () => {
    const res = await authRequest(
      app,
      `/api/publish/diff/mobs/${VNUMS.DIFF_MOB}`,
      lowOnlyCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toHaveProperty(
      "immortal",
      expect.objectContaining({ name: "diff mob" }),
    );
    expect(body).toHaveProperty("production", null);
  });

  test("object diff returns correct data", async () => {
    const res = await authRequest(
      app,
      `/api/publish/diff/objects/${VNUMS.DIFF_OBJ}`,
      lowOnlyCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toHaveProperty(
      "immortal",
      expect.objectContaining({ name: "diff object" }),
    );
    expect(body).toHaveProperty("production", null);
  });
});

// ===========================================================================
// Step 3: Publish endpoints
// ===========================================================================

describe("single entity publish", () => {
  beforeAll(async () => {
    // Create entities in immortal via lowOnlyUser
    await createAndUpdate("rooms", VNUMS.PUB_ROOM, lowOnlyCookie, {
      ...validRoomUpdate,
      exits: [
        {
          block: 1,
          condition_flag: 0,
          description: "A passage north.",
          destination: 300,
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
    });

    await createAndUpdate("mobs", VNUMS.PUB_MOB, lowOnlyCookie, {
      ...validMobUpdate,
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
    });

    await createAndUpdate("objects", VNUMS.PUB_OBJ, lowOnlyCookie, {
      ...validObjUpdate,
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

    // Verify via diff - both sides should now have data
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
        expect.objectContaining({ destination: 300, direction: 0 }),
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

  test("republish is idempotent", async () => {
    // Publish room again - should overwrite cleanly
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
    // Verify child rows were not duplicated - exactly one exit and one extra
    expect(diff).toHaveProperty("production.exits", [
      expect.objectContaining({ destination: 300, direction: 0 }),
    ]);
    expect(diff).toHaveProperty("production.extras", [
      expect.objectContaining({ name: "wall carving" }),
    ]);
  });
});

describe("senior bypass on publish", () => {
  beforeAll(async () => {
    // Create a room in expandedUser's blocks
    await createAndUpdate("rooms", VNUMS.EXPANDED_ROOM, expandedCookie, {
      ...validRoomUpdate,
      name: "Expanded Publish Room",
    });
  });

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
    // expandedUser is senior - can access any vnum including outside blocks 200-299
    await createAndUpdate("rooms", VNUMS.VNUM_ACCESS_ROOM, expandedCookie, {
      ...validRoomUpdate,
      name: "Out-of-Block Room",
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
    await createAndUpdate("rooms", VNUMS.PUB_BULK_ROOM, lowOnlyCookie, {
      ...validRoomUpdate,
      name: "Bulk Room",
    });
    await createAndUpdate("mobs", VNUMS.PUB_BULK_MOB, lowOnlyCookie, {
      ...validMobUpdate,
      name: "bulk mob",
      short_desc: "a bulk mob",
    });
    await createAndUpdate("objects", VNUMS.PUB_BULK_OBJ, lowOnlyCookie, {
      ...validObjUpdate,
      name: "bulk object",
      short_desc: "a bulk object",
    });
  });

  test("publishes all entities in single request", async () => {
    const res = await authRequest(app, "/api/publish/bulk", lowOnlyCookie, {
      body: JSON.stringify({
        entities: [
          { type: "room", vnum: VNUMS.PUB_BULK_ROOM },
          { type: "mob", vnum: VNUMS.PUB_BULK_MOB },
          { type: "object", vnum: VNUMS.PUB_BULK_OBJ },
        ],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ ok: true });

    // Verify all three were published via diff endpoints
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
        entities: [{ type: "room", vnum: 100 }],
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
});

// ===========================================================================
// Dashboard
// ===========================================================================

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

    // All entities should have a resolved owner name string
    for (const entity of body) {
      expect(entity).toHaveProperty("owner", expect.any(String));
    }
  });
});
