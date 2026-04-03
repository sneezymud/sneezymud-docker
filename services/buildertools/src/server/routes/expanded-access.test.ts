import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import {
  authRequest,
  getAuthCookie,
  getExpandedAuthCookie,
  getLowOnlyAuthCookie,
} from "../test-helpers.ts";

/**
 * Tests for expanded vnum access (POWER_LOW / POWER_NO_LIMITS).
 *
 * Setup:
 * - testUser: blocks 100-199, all powers (no POWER_LOW)
 * - expandedUser: blocks 200-299, POWER_LOW + POWER_NO_LIMITS + entity powers
 * - lowOnlyUser: blocks 300-399, POWER_LOW (no POWER_NO_LIMITS) + entity powers
 *
 * Expanded users can access any vnum NOT assigned to another builder's blocks.
 * Vnums 100-199 are testUser's blocks - expanded users cannot access them.
 * Vnums 200-299 are expandedUser's own blocks (always accessible).
 * Vnums 300-399 are lowOnlyUser's own blocks (always accessible).
 * Vnums 400+ are unassigned - expanded users CAN access these via expansion.
 *
 * Rooms additionally require POWER_NO_LIMITS for expansion. lowOnlyUser
 * (POWER_LOW only) can expand for mobs/objects but NOT rooms.
 */

// Vnums reserved for this test file
const OWN_MOB = 200;
const OWN_OBJ = 201;
const OWN_ROOM = 202;
const EXPANDED_MOB = 400;
const EXPANDED_OBJ = 401;
const EXPANDED_ROOM = 402;
const EXPANDED_MOB_2 = 403;
const BLOCKED_MOB = 100;
const BLOCKED_OBJ = 101;
const BLOCKED_ROOM = 102;
const LOW_ONLY_MOB = 404;
const LOW_ONLY_ROOM = 405;

let expandedCookie: string;
let testCookie: string;
let lowOnlyCookie: string;

beforeAll(async () => {
  expandedCookie = await getExpandedAuthCookie(app);
  testCookie = await getAuthCookie(app);
  lowOnlyCookie = await getLowOnlyAuthCookie(app);
});

afterAll(async () => {
  const allVnums = sql`(${OWN_MOB}, ${EXPANDED_MOB}, ${EXPANDED_MOB_2}, ${BLOCKED_MOB}, ${LOW_ONLY_MOB})`;
  await immortalDb.execute(
    sql`DELETE FROM mob_extra WHERE vnum IN ${allVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM mob_imm WHERE vnum IN ${allVnums}`);
  await immortalDb.execute(
    sql`DELETE FROM mobresponses WHERE vnum IN ${allVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM mob WHERE vnum IN ${allVnums}`);

  const objVnums = sql`(${OWN_OBJ}, ${EXPANDED_OBJ}, ${BLOCKED_OBJ})`;
  await immortalDb.execute(
    sql`DELETE FROM objaffect WHERE vnum IN ${objVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM objextra WHERE vnum IN ${objVnums}`);
  await immortalDb.execute(sql`DELETE FROM obj WHERE vnum IN ${objVnums}`);

  const roomVnums = sql`(${OWN_ROOM}, ${EXPANDED_ROOM}, ${BLOCKED_ROOM}, ${LOW_ONLY_ROOM})`;
  await immortalDb.execute(
    sql`DELETE FROM roomextra WHERE vnum IN ${roomVnums}`,
  );
  await immortalDb.execute(
    sql`DELETE FROM roomexit WHERE vnum IN ${roomVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM room WHERE vnum IN ${roomVnums}`);
});

const JSON_HEADERS = { "Content-Type": "application/json" };

function post(
  path: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return authRequest(app, path, cookie, {
    body: JSON.stringify(body),
    headers: JSON_HEADERS,
    method: "POST",
  });
}

function put(
  path: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return authRequest(app, path, cookie, {
    body: JSON.stringify(body),
    headers: JSON_HEADERS,
    method: "PUT",
  });
}

function get(path: string, cookie: string): Promise<Response> {
  return authRequest(app, path, cookie);
}

function del(path: string, cookie: string): Promise<Response> {
  return authRequest(app, path, cookie, { method: "DELETE" });
}

function bulkDel(
  path: string,
  cookie: string,
  vnums: number[],
): Promise<Response> {
  return authRequest(app, path, cookie, {
    body: JSON.stringify({ vnums }),
    headers: JSON_HEADERS,
    method: "DELETE",
  });
}

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
  description: "An expanded test mob.",
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
  long_desc: "An expanded test mob stands here.",
  max_exist: 0,
  name: "expanded test mob",
  per: 0,
  race: 0,
  sex: 0,
  short_desc: "an expanded mob",
  skin: 0,
  spe: 0,
  spec_proc: 0,
  str: 0,
  tohit: 0,
  vision: 0,
  weight: 0,
  wis: 0,
};

// ---------------------------------------------------------------------------
// Mobs
// ---------------------------------------------------------------------------

describe("expanded mob access", () => {
  test("expanded user can create mob in own block", async () => {
    const res = await post("/api/mobs", expandedCookie, { vnum: OWN_MOB });
    expect(res.status).toBe(201);
  });

  test("expanded user can create mob at unassigned vnum", async () => {
    const res = await post("/api/mobs", expandedCookie, {
      vnum: EXPANDED_MOB,
    });
    expect(res.status).toBe(201);
  });

  test("expanded user cannot create mob at vnum in another builder's block", async () => {
    const res = await post("/api/mobs", expandedCookie, { vnum: BLOCKED_MOB });
    expect(res.status).toBe(403);
  });

  test("expanded user can GET mob at unassigned vnum", async () => {
    const res = await get(`/api/mobs/${EXPANDED_MOB}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("expanded user cannot GET mob at vnum in another builder's block", async () => {
    // Create a mob as testUser at a vnum in their block
    await post("/api/mobs", testCookie, { vnum: BLOCKED_MOB });
    const res = await get(`/api/mobs/${BLOCKED_MOB}`, expandedCookie);
    expect(res.status).toBe(403);
  });

  test("expanded user can PUT mob at unassigned vnum", async () => {
    const res = await put(`/api/mobs/${EXPANDED_MOB}`, expandedCookie, {
      ...validMobUpdate,
      vnum: EXPANDED_MOB,
    });
    expect(res.status).toBe(200);
  });

  test("expanded user cannot PUT mob at vnum in another builder's block", async () => {
    const res = await put(`/api/mobs/${BLOCKED_MOB}`, expandedCookie, {
      ...validMobUpdate,
      vnum: BLOCKED_MOB,
    });
    expect(res.status).toBe(403);
  });

  test("expanded user can DELETE mob at unassigned vnum", async () => {
    // Create then delete
    await post("/api/mobs", expandedCookie, { vnum: EXPANDED_MOB_2 });
    const res = await del(`/api/mobs/${EXPANDED_MOB_2}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("expanded user cannot DELETE mob at vnum in another builder's block", async () => {
    const res = await del(`/api/mobs/${BLOCKED_MOB}`, expandedCookie);
    expect(res.status).toBe(403);
  });

  test("list includes own-block and expanded mobs, excludes other builders", async () => {
    const res = await get("/api/mobs", expandedCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    // Includes own block and expanded vnums
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vnum: OWN_MOB }),
        expect.objectContaining({ vnum: EXPANDED_MOB }),
      ]),
    );
    // Does not include vnum from another builder's block
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: BLOCKED_MOB })]),
    );
  });

  test("expanded user can bulk delete at expanded vnums", async () => {
    // Re-create for bulk delete
    await post("/api/mobs", expandedCookie, { vnum: EXPANDED_MOB_2 });
    const res = await bulkDel("/api/mobs/bulk", expandedCookie, [
      EXPANDED_MOB_2,
    ]);
    expect(res.status).toBe(200);
  });

  test("expanded user cannot bulk delete at vnums in another builder's block", async () => {
    const res = await bulkDel("/api/mobs/bulk", expandedCookie, [BLOCKED_MOB]);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

describe("expanded object access", () => {
  test("expanded user can create object in own block", async () => {
    const res = await post("/api/objects", expandedCookie, { vnum: OWN_OBJ });
    expect(res.status).toBe(201);
  });

  test("expanded user can create object at unassigned vnum", async () => {
    const res = await post("/api/objects", expandedCookie, {
      vnum: EXPANDED_OBJ,
    });
    expect(res.status).toBe(201);
  });

  test("expanded user cannot create object at vnum in another builder's block", async () => {
    const res = await post("/api/objects", expandedCookie, {
      vnum: BLOCKED_OBJ,
    });
    expect(res.status).toBe(403);
  });

  test("expanded user can GET object at unassigned vnum", async () => {
    const res = await get(`/api/objects/${EXPANDED_OBJ}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("expanded user cannot GET object at vnum in another builder's block", async () => {
    const res = await get(`/api/objects/${BLOCKED_OBJ}`, expandedCookie);
    expect(res.status).toBe(403);
  });

  test("list includes own-block and expanded objects, excludes other builders", async () => {
    const res = await get("/api/objects", expandedCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vnum: OWN_OBJ }),
        expect.objectContaining({ vnum: EXPANDED_OBJ }),
      ]),
    );
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: BLOCKED_OBJ })]),
    );
  });
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

describe("expanded room access", () => {
  test("expanded user can create room in own block", async () => {
    const res = await post("/api/rooms", expandedCookie, { vnum: OWN_ROOM });
    expect(res.status).toBe(201);
  });

  test("expanded user can create room at unassigned vnum", async () => {
    const res = await post("/api/rooms", expandedCookie, {
      vnum: EXPANDED_ROOM,
    });
    expect(res.status).toBe(201);
  });

  test("expanded user cannot create room at vnum in another builder's block", async () => {
    const res = await post("/api/rooms", expandedCookie, {
      vnum: BLOCKED_ROOM,
    });
    expect(res.status).toBe(403);
  });

  test("expanded user can GET room at unassigned vnum", async () => {
    const res = await get(`/api/rooms/${EXPANDED_ROOM}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("expanded user cannot GET room at vnum in another builder's block", async () => {
    const res = await get(`/api/rooms/${BLOCKED_ROOM}`, expandedCookie);
    expect(res.status).toBe(403);
  });

  test("list includes own-block and expanded rooms, excludes other builders", async () => {
    const res = await get("/api/rooms", expandedCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vnum: OWN_ROOM }),
        expect.objectContaining({ vnum: EXPANDED_ROOM }),
      ]),
    );
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: BLOCKED_ROOM })]),
    );
  });
});

// ---------------------------------------------------------------------------
// Rooms require POWER_NO_LIMITS for expansion (mobs/objects only need LOW)
// ---------------------------------------------------------------------------

describe("POWER_LOW without POWER_NO_LIMITS", () => {
  test("LOW-only user can create mob at unassigned vnum", async () => {
    const res = await post("/api/mobs", lowOnlyCookie, { vnum: LOW_ONLY_MOB });
    expect(res.status).toBe(201);
  });

  test("LOW-only user cannot create room at unassigned vnum", async () => {
    const res = await post("/api/rooms", lowOnlyCookie, {
      vnum: LOW_ONLY_ROOM,
    });
    expect(res.status).toBe(403);
  });

  test("LOW-only user can GET mob at unassigned vnum", async () => {
    const res = await get(`/api/mobs/${LOW_ONLY_MOB}`, lowOnlyCookie);
    expect(res.status).toBe(200);
  });

  test("LOW-only user cannot GET room at unassigned vnum", async () => {
    // EXPANDED_ROOM was created by expandedUser - it's at an unassigned vnum
    // lowOnlyUser has POWER_LOW but rooms need NO_LIMITS too
    const res = await get(`/api/rooms/${EXPANDED_ROOM}`, lowOnlyCookie);
    expect(res.status).toBe(403);
  });
});
