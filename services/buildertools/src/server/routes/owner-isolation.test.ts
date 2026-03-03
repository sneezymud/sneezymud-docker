import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import {
  authRequest,
  getAuthCookie,
  getOtherAuthCookie,
} from "../test-helpers.ts";

// Vnums 180-189 reserved for this test file
const MOB_SHARED = 180;
const MOB_B_ONLY = 181;
const ROOM_SHARED = 182;
const ROOM_B_ONLY = 183;
const OBJ_SHARED = 184;
const OBJ_B_ONLY = 185;
const RESP_SHARED = 186;
const RESP_B_ONLY = 187;

let cookieA: string;
let cookieB: string;

beforeAll(async () => {
  cookieA = await getAuthCookie(app);
  cookieB = await getOtherAuthCookie(app);
});

afterAll(async () => {
  const mobVnums = sql`(${MOB_SHARED}, ${MOB_B_ONLY}, ${RESP_SHARED}, ${RESP_B_ONLY})`;
  await immortalDb.execute(
    sql`DELETE FROM mob_extra WHERE vnum IN ${mobVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM mob_imm WHERE vnum IN ${mobVnums}`);
  await immortalDb.execute(
    sql`DELETE FROM mobresponses WHERE vnum IN ${mobVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM mob WHERE vnum IN ${mobVnums}`);

  const roomVnums = sql`(${ROOM_SHARED}, ${ROOM_B_ONLY})`;
  await immortalDb.execute(
    sql`DELETE FROM roomextra WHERE vnum IN ${roomVnums}`,
  );
  await immortalDb.execute(
    sql`DELETE FROM roomexit WHERE vnum IN ${roomVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM room WHERE vnum IN ${roomVnums}`);

  const objVnums = sql`(${OBJ_SHARED}, ${OBJ_B_ONLY})`;
  await immortalDb.execute(
    sql`DELETE FROM objaffect WHERE vnum IN ${objVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM objextra WHERE vnum IN ${objVnums}`);
  await immortalDb.execute(sql`DELETE FROM obj WHERE vnum IN ${objVnums}`);
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

// ---------------------------------------------------------------------------
// Mobs
// ---------------------------------------------------------------------------

describe("mob owner isolation", () => {
  test("two builders can create the same vnum independently", async () => {
    const resA = await post("/api/mobs", cookieA, { vnum: MOB_SHARED });
    expect(resA.status).toBe(201);

    const resB = await post("/api/mobs", cookieB, { vnum: MOB_SHARED });
    expect(resB.status).toBe(201);
  });

  test("builder A cannot see builder B's entity", async () => {
    await post("/api/mobs", cookieB, { vnum: MOB_B_ONLY });

    const res = await authRequest(app, `/api/mobs/${MOB_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);
  });

  test("builder A's list does not include builder B's entities", async () => {
    const res = await authRequest(app, "/api/mobs", cookieA);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: MOB_SHARED })]),
    );
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: MOB_B_ONLY })]),
    );
  });

  test("builder A cannot update builder B's entity", async () => {
    const res = await put(`/api/mobs/${MOB_B_ONLY}`, cookieA, {
      ac: 0,
      actions: 0,
      adjacent_sound: "",
      affects: 0,
      agi: 10,
      attacks: 1,
      bra: 10,
      can_be_seen: 1,
      cha: 10,
      class: 0,
      con: 10,
      damage_level: 1,
      damage_precision: 1,
      def_position: 8,
      description: "hacked",
      dex: 10,
      extras: [],
      fact_perc: 0,
      faction: 0,
      foc: 10,
      gold: 0,
      height: 70,
      hpbonus: 0,
      immunities: [],
      intel: 10,
      kar: 10,
      level: 1,
      local_sound: "",
      long_desc: "hacked",
      max_exist: 1,
      name: "hacked",
      per: 10,
      race: 0,
      sex: 0,
      short_desc: "hacked",
      skin: 0,
      spe: 10,
      spec_proc: 0,
      str: 10,
      tohit: 0,
      vision: 0,
      vnum: MOB_B_ONLY,
      weight: 100,
      wis: 10,
    });
    expect(res.status).toBe(404);
  });

  test("builder A cannot delete builder B's entity", async () => {
    const res = await del(`/api/mobs/${MOB_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);

    const check = await authRequest(app, `/api/mobs/${MOB_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });

  test("bulk delete only affects own entities", async () => {
    const res = await bulkDel("/api/mobs/bulk", cookieA, [
      MOB_SHARED,
      MOB_B_ONLY,
    ]);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 1, ok: true });

    const check = await authRequest(app, `/api/mobs/${MOB_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

describe("room owner isolation", () => {
  test("two builders can create the same vnum independently", async () => {
    const resA = await post("/api/rooms", cookieA, { vnum: ROOM_SHARED });
    expect(resA.status).toBe(201);

    const resB = await post("/api/rooms", cookieB, { vnum: ROOM_SHARED });
    expect(resB.status).toBe(201);
  });

  test("builder A cannot see builder B's room", async () => {
    await post("/api/rooms", cookieB, { vnum: ROOM_B_ONLY });

    const res = await authRequest(app, `/api/rooms/${ROOM_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);
  });

  test("builder A's list does not include builder B's rooms", async () => {
    const res = await authRequest(app, "/api/rooms", cookieA);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: ROOM_SHARED })]),
    );
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: ROOM_B_ONLY })]),
    );
  });

  test("builder A cannot update builder B's room", async () => {
    const res = await put(`/api/rooms/${ROOM_B_ONLY}`, cookieA, {
      capacity: 0,
      description: "hacked",
      exits: [],
      extras: [],
      height: 0,
      name: "hacked",
      river_dir: 0,
      river_speed: 0,
      room_flag: 0,
      sector: 0,
      spec: 0,
      telelook: 0,
      teletarg: 0,
      teletime: 0,
      vnum: ROOM_B_ONLY,
      x: 0,
      y: 0,
      z: 0,
      zone: 1,
    });
    expect(res.status).toBe(404);
  });

  test("builder A cannot delete builder B's room", async () => {
    const res = await del(`/api/rooms/${ROOM_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);

    const check = await authRequest(app, `/api/rooms/${ROOM_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });

  test("bulk delete only affects own rooms", async () => {
    const res = await bulkDel("/api/rooms/bulk", cookieA, [
      ROOM_SHARED,
      ROOM_B_ONLY,
    ]);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 1, ok: true });

    const check = await authRequest(app, `/api/rooms/${ROOM_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

describe("object owner isolation", () => {
  test("two builders can create the same vnum independently", async () => {
    const resA = await post("/api/objects", cookieA, { vnum: OBJ_SHARED });
    expect(resA.status).toBe(201);

    const resB = await post("/api/objects", cookieB, { vnum: OBJ_SHARED });
    expect(resB.status).toBe(201);
  });

  test("builder A cannot see builder B's object", async () => {
    await post("/api/objects", cookieB, { vnum: OBJ_B_ONLY });

    const res = await authRequest(app, `/api/objects/${OBJ_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);
  });

  test("builder A's list does not include builder B's objects", async () => {
    const res = await authRequest(app, "/api/objects", cookieA);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: OBJ_SHARED })]),
    );
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: OBJ_B_ONLY })]),
    );
  });

  test("builder A cannot update builder B's object", async () => {
    const res = await put(`/api/objects/${OBJ_B_ONLY}`, cookieA, {
      action_desc: "hacked",
      action_flag: 0,
      affects: [],
      can_be_seen: 1,
      cur_struct: 100,
      decay: 0,
      extras: [],
      long_desc: "hacked",
      material: 0,
      max_exist: 1,
      max_struct: 100,
      name: "hacked",
      price: 0,
      short_desc: "hacked",
      spec_proc: 0,
      type: 0,
      val0: 0,
      val1: 0,
      val2: 0,
      val3: 0,
      vnum: OBJ_B_ONLY,
      volume: 0,
      wear_flag: 0,
      weight: 1,
    });
    expect(res.status).toBe(404);
  });

  test("builder A cannot delete builder B's object", async () => {
    const res = await del(`/api/objects/${OBJ_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);

    const check = await authRequest(app, `/api/objects/${OBJ_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });

  test("bulk delete only affects own objects", async () => {
    const res = await bulkDel("/api/objects/bulk", cookieA, [
      OBJ_SHARED,
      OBJ_B_ONLY,
    ]);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 1, ok: true });

    const check = await authRequest(app, `/api/objects/${OBJ_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Mob response owner isolation
// ---------------------------------------------------------------------------

describe("mob response owner isolation", () => {
  beforeAll(async () => {
    // Both builders create mob at shared vnum (needed as mob must exist for responses)
    await post("/api/mobs", cookieA, { vnum: RESP_SHARED });
    await post("/api/mobs", cookieB, { vnum: RESP_SHARED });
    // Only B creates mob at B-only vnum
    await post("/api/mobs", cookieB, { vnum: RESP_B_ONLY });

    // B sets responses on both mobs
    await put(`/api/mob-responses/${RESP_SHARED}`, cookieB, {
      response: 'say {"hello from B";}',
      vnum: RESP_SHARED,
    });
    await put(`/api/mob-responses/${RESP_B_ONLY}`, cookieB, {
      response: 'say {"secret";}',
      vnum: RESP_B_ONLY,
    });
  });

  test("builder A cannot see builder B's mob response", async () => {
    // A's mob at RESP_SHARED has no response set - should get empty string
    const res = await authRequest(
      app,
      `/api/mob-responses/${RESP_SHARED}`,
      cookieA,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ response: "", vnum: RESP_SHARED }),
    );
  });

  test("builder A's response on shared mob is independent from B's", async () => {
    // A sets their own response on the shared mob
    const putRes = await put(`/api/mob-responses/${RESP_SHARED}`, cookieA, {
      response: 'say {"hello from A";}',
      vnum: RESP_SHARED,
    });
    expect(putRes.status).toBe(200);

    // B's response is still their own
    const bRes = await authRequest(
      app,
      `/api/mob-responses/${RESP_SHARED}`,
      cookieB,
    );
    const bBody: unknown = await bRes.json();
    expect(bBody).toHaveProperty("response", 'say {"hello from B";}');
  });

  test("builder A cannot access response on B-only mob", async () => {
    const res = await authRequest(
      app,
      `/api/mob-responses/${RESP_B_ONLY}`,
      cookieA,
    );
    // Mob itself doesn't exist for A, so 404
    expect(res.status).toBe(404);
  });
});
