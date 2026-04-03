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
 * Tests for senior user vnum access (POWER_LOW / POWER_NO_LIMITS).
 *
 * Setup:
 * - testUser: blocks 100-199, all powers (no POWER_LOW) - standard builder
 * - expandedUser: blocks 200-299, POWER_LOW + POWER_NO_LIMITS - senior user
 * - lowOnlyUser: blocks 300-399, POWER_LOW - senior user
 *
 * Senior users bypass ALL vnum checks and can access any vnum, including vnums
 * inside other builders' blocks. Standard builders are restricted to their own
 * blocks.
 *
 * Lists are always scoped by owner, so senior users only see their own entities
 * regardless of which vnums those entities occupy.
 */

// Vnums reserved for this test file
const OWN_MOB = 200;
const OWN_OBJ = 201;
const OWN_ROOM = 202;
const OUTSIDE_MOB = 400;
const OUTSIDE_OBJ = 401;
const OUTSIDE_ROOM = 402;
const OUTSIDE_MOB_2 = 403;
const OTHER_BLOCK_MOB = 100;
const OTHER_BLOCK_OBJ = 101;
const OTHER_BLOCK_ROOM = 102;
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
  const allVnums = sql`(${OWN_MOB}, ${OUTSIDE_MOB}, ${OUTSIDE_MOB_2}, ${OTHER_BLOCK_MOB}, ${LOW_ONLY_MOB})`;
  await immortalDb.execute(
    sql`DELETE FROM mob_extra WHERE vnum IN ${allVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM mob_imm WHERE vnum IN ${allVnums}`);
  await immortalDb.execute(
    sql`DELETE FROM mobresponses WHERE vnum IN ${allVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM mob WHERE vnum IN ${allVnums}`);

  const objVnums = sql`(${OWN_OBJ}, ${OUTSIDE_OBJ}, ${OTHER_BLOCK_OBJ})`;
  await immortalDb.execute(
    sql`DELETE FROM objaffect WHERE vnum IN ${objVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM objextra WHERE vnum IN ${objVnums}`);
  await immortalDb.execute(sql`DELETE FROM obj WHERE vnum IN ${objVnums}`);

  const roomVnums = sql`(${OWN_ROOM}, ${OUTSIDE_ROOM}, ${OTHER_BLOCK_ROOM}, ${LOW_ONLY_ROOM})`;
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

describe("senior user mob access", () => {
  test("senior user can create mob in own block", async () => {
    const res = await post("/api/mobs", expandedCookie, { vnum: OWN_MOB });
    expect(res.status).toBe(201);
  });

  test("senior user can create mob at vnum outside own block", async () => {
    const res = await post("/api/mobs", expandedCookie, {
      vnum: OUTSIDE_MOB,
    });
    expect(res.status).toBe(201);
  });

  test("senior user can create mob at vnum in another builder's block", async () => {
    // Create a mob as testUser at their block first
    await post("/api/mobs", testCookie, { vnum: OTHER_BLOCK_MOB });
    // expandedUser (senior) can also create at that vnum under their own owner
    const res = await post("/api/mobs", expandedCookie, {
      vnum: OTHER_BLOCK_MOB,
    });
    expect(res.status).toBe(201);
  });

  test("senior user can GET mob at vnum outside own block", async () => {
    const res = await get(`/api/mobs/${OUTSIDE_MOB}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("senior user can GET their own mob at vnum in another builder's block", async () => {
    const res = await get(`/api/mobs/${OTHER_BLOCK_MOB}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("senior user can PUT mob at vnum outside own block", async () => {
    const res = await put(`/api/mobs/${OUTSIDE_MOB}`, expandedCookie, {
      ...validMobUpdate,
      vnum: OUTSIDE_MOB,
    });
    expect(res.status).toBe(200);
  });

  test("senior user can PUT their own mob at vnum in another builder's block", async () => {
    const res = await put(`/api/mobs/${OTHER_BLOCK_MOB}`, expandedCookie, {
      ...validMobUpdate,
      vnum: OTHER_BLOCK_MOB,
    });
    expect(res.status).toBe(200);
  });

  test("senior user can DELETE mob at vnum outside own block", async () => {
    await post("/api/mobs", expandedCookie, { vnum: OUTSIDE_MOB_2 });
    const res = await del(`/api/mobs/${OUTSIDE_MOB_2}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("senior user can bulk delete at vnums outside own block", async () => {
    await post("/api/mobs", expandedCookie, { vnum: OUTSIDE_MOB_2 });
    const res = await bulkDel("/api/mobs/bulk", expandedCookie, [
      OUTSIDE_MOB_2,
    ]);
    expect(res.status).toBe(200);
  });

  test("list shows only own entities regardless of vnum", async () => {
    const res = await get("/api/mobs", expandedCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    // Includes own mobs at any vnum, including one in another builder's block
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vnum: OWN_MOB }),
        expect.objectContaining({ vnum: OUTSIDE_MOB }),
        expect.objectContaining({ vnum: OTHER_BLOCK_MOB }),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

describe("senior user object access", () => {
  test("senior user can create object in own block", async () => {
    const res = await post("/api/objects", expandedCookie, { vnum: OWN_OBJ });
    expect(res.status).toBe(201);
  });

  test("senior user can create object at vnum outside own block", async () => {
    const res = await post("/api/objects", expandedCookie, {
      vnum: OUTSIDE_OBJ,
    });
    expect(res.status).toBe(201);
  });

  test("senior user can create object at vnum in another builder's block", async () => {
    const res = await post("/api/objects", expandedCookie, {
      vnum: OTHER_BLOCK_OBJ,
    });
    expect(res.status).toBe(201);
  });

  test("senior user can GET object at vnum outside own block", async () => {
    const res = await get(`/api/objects/${OUTSIDE_OBJ}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("senior user can GET their own object at vnum in another builder's block", async () => {
    const res = await get(`/api/objects/${OTHER_BLOCK_OBJ}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("list shows only own entities regardless of vnum", async () => {
    const res = await get("/api/objects", expandedCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vnum: OWN_OBJ }),
        expect.objectContaining({ vnum: OUTSIDE_OBJ }),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

describe("senior user room access", () => {
  test("senior user can create room in own block", async () => {
    const res = await post("/api/rooms", expandedCookie, { vnum: OWN_ROOM });
    expect(res.status).toBe(201);
  });

  test("senior user can create room at vnum outside own block", async () => {
    const res = await post("/api/rooms", expandedCookie, {
      vnum: OUTSIDE_ROOM,
    });
    expect(res.status).toBe(201);
  });

  test("senior user can create room at vnum in another builder's block", async () => {
    const res = await post("/api/rooms", expandedCookie, {
      vnum: OTHER_BLOCK_ROOM,
    });
    expect(res.status).toBe(201);
  });

  test("senior user can GET room at vnum outside own block", async () => {
    const res = await get(`/api/rooms/${OUTSIDE_ROOM}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("senior user can GET their own room at vnum in another builder's block", async () => {
    const res = await get(`/api/rooms/${OTHER_BLOCK_ROOM}`, expandedCookie);
    expect(res.status).toBe(200);
  });

  test("list shows only own entities regardless of vnum", async () => {
    const res = await get("/api/rooms", expandedCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vnum: OWN_ROOM }),
        expect.objectContaining({ vnum: OUTSIDE_ROOM }),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// LOW-only user has same senior bypass as LOW+NO_LIMITS
// ---------------------------------------------------------------------------

describe("POWER_LOW user (without POWER_NO_LIMITS)", () => {
  test("LOW-only user can create mob at vnum outside own block", async () => {
    const res = await post("/api/mobs", lowOnlyCookie, { vnum: LOW_ONLY_MOB });
    expect(res.status).toBe(201);
  });

  test("LOW-only user can create room at vnum outside own block", async () => {
    const res = await post("/api/rooms", lowOnlyCookie, {
      vnum: LOW_ONLY_ROOM,
    });
    expect(res.status).toBe(201);
  });

  test("LOW-only user can GET mob at vnum outside own block", async () => {
    const res = await get(`/api/mobs/${LOW_ONLY_MOB}`, lowOnlyCookie);
    expect(res.status).toBe(200);
  });

  test("LOW-only user can GET room at vnum outside own block", async () => {
    const res = await get(`/api/rooms/${LOW_ONLY_ROOM}`, lowOnlyCookie);
    expect(res.status).toBe(200);
  });
});
