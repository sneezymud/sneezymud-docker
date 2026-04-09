import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import {
  authRequest,
  getAuthCookie,
  getOtherAuthCookie,
} from "../test-helpers.ts";

// Vnums 190-199 reserved for power gate tests
let testCookie: string; // testbuilder - all powers
let otherCookie: string; // otherbuilder - partial powers (no OEDIT_COST, OEDIT_APPLYS, OEDIT_WEAPONS, OEDIT_NOPROTOS, OEDIT_IMP_POWER, MEDIT_IMP_POWER, REDIT_ENABLED)

beforeAll(async () => {
  testCookie = await getAuthCookie(app);
  otherCookie = await getOtherAuthCookie(app);
});

afterAll(async () => {
  const vnums = sql`(190, 191, 192, 193, 194, 195, 196, 197)`;
  await immortalDb.execute(sql`DELETE FROM objaffect WHERE vnum IN ${vnums}`);
  await immortalDb.execute(sql`DELETE FROM objextra WHERE vnum IN ${vnums}`);
  await immortalDb.execute(sql`DELETE FROM obj WHERE vnum IN ${vnums}`);
  await immortalDb.execute(sql`DELETE FROM mob_extra WHERE vnum IN ${vnums}`);
  await immortalDb.execute(sql`DELETE FROM mob_imm WHERE vnum IN ${vnums}`);
  await immortalDb.execute(
    sql`DELETE FROM mobresponses WHERE vnum IN ${vnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM mob WHERE vnum IN ${vnums}`);
  await immortalDb.execute(sql`DELETE FROM roomextra WHERE vnum IN ${vnums}`);
  await immortalDb.execute(sql`DELETE FROM roomexit WHERE vnum IN ${vnums}`);
  await immortalDb.execute(sql`DELETE FROM room WHERE vnum IN ${vnums}`);
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

// Valid object payload with all required fields
const baseObjPayload = {
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
  name: "",
  price: 0,
  short_desc: "",
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

// Valid mob payload with all required fields (mobInputSchema requires non-empty strings)
const baseMobPayload = {
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
  description: "A test mob.",
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
  long_desc: "A test mob stands here.",
  max_exist: 0,
  name: "test mob",
  per: 0,
  race: 0,
  sex: 0,
  short_desc: "a test mob",
  skin: 0,
  spe: 0,
  spec_proc: 0,
  str: 0,
  tohit: 0,
  vision: 0,
  weight: 0,
  wis: 0,
};

// Valid room payload with all required fields
const baseRoomPayload = {
  capacity: 0,
  description: "",
  exits: [],
  extras: [],
  height: -1,
  name: "",
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

// ---------------------------------------------------------------------------
// Object power gates (otherbuilder lacks OEDIT_COST, OEDIT_APPLYS,
// OEDIT_WEAPONS, OEDIT_NOPROTOS, OEDIT_IMP_POWER)
// ---------------------------------------------------------------------------

describe("object power gates", () => {
  beforeAll(async () => {
    for (const vnum of [190, 191, 192, 193, 194, 195]) {
      await post("/api/objects", otherCookie, { vnum });
    }
  });

  test("without OEDIT_COST: price change is silently reverted", async () => {
    // otherbuilder's object at 190 has price=0 (default from creation)
    // otherbuilder lacks OEDIT_COST, so the request is rejected with 403
    const putRes = await put("/api/objects/190", otherCookie, {
      ...baseObjPayload,
      price: 500,
      vnum: 190,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: 'Changing "price" requires POWER_OEDIT_COST',
      }),
    );
  });

  test("without OEDIT_APPLYS: affects change is silently reverted", async () => {
    // Object 191 has empty affects by default - otherbuilder tries to add one
    const putRes = await put("/api/objects/191", otherCookie, {
      ...baseObjPayload,
      affects: [{ mod1: 5, mod2: 0, type: 18, vnum: 191 }],
      vnum: 191,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: 'Changing "affects" requires POWER_OEDIT_APPLYS',
      }),
    );
  });

  test("without OEDIT_WEAPONS: weapon val0-val3 changes are silently reverted", async () => {
    const ITEM_WEAPON = 5;

    // First set the object type to weapon (non-gated field)
    await put("/api/objects/192", otherCookie, {
      ...baseObjPayload,
      type: ITEM_WEAPON,
      vnum: 192,
    });

    // Now try to change weapon values - should be rejected with 403
    const putRes = await put("/api/objects/192", otherCookie, {
      ...baseObjPayload,
      type: ITEM_WEAPON,
      val0: 10,
      val1: 20,
      val2: 30,
      val3: 40,
      vnum: 192,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: "Changing weapon values requires POWER_OEDIT_WEAPONS",
      }),
    );
  });

  test("without OEDIT_NOPROTOS: cannot clear PROTOTYPE bit", async () => {
    const PROTOTYPE_BIT = 1 << 4;

    // Set PROTOTYPE bit via direct DB (simulating a higher-power builder set it)
    await immortalDb.execute(
      sql`UPDATE obj SET action_flag = ${PROTOTYPE_BIT} WHERE vnum = 193 AND player_id = 99997`,
    );

    // otherbuilder tries to clear it (action_flag=0) - should be rejected with 403
    const putRes = await put("/api/objects/193", otherCookie, {
      ...baseObjPayload,
      action_flag: 0,
      vnum: 193,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: "Changing the prototype flag requires POWER_OEDIT_NOPROTOS",
      }),
    );
  });

  test("without OEDIT_NOPROTOS: cannot set PROTOTYPE bit", async () => {
    const PROTOTYPE_BIT = 1 << 4;

    // Object 194 starts with action_flag=0 (no PROTOTYPE)
    // otherbuilder tries to set the PROTOTYPE bit - should be rejected with 403
    const putRes = await put("/api/objects/194", otherCookie, {
      ...baseObjPayload,
      action_flag: PROTOTYPE_BIT,
      vnum: 194,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: "Changing the prototype flag requires POWER_OEDIT_NOPROTOS",
      }),
    );
  });

  test("without OEDIT_IMP_POWER: unassignable spec_proc is silently reverted", async () => {
    // spec_proc 5 is unassignable for objects - should be rejected with 403
    const putRes = await put("/api/objects/195", otherCookie, {
      ...baseObjPayload,
      spec_proc: 5,
      vnum: 195,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error:
          'Changing "spec_proc" to an unassignable value requires POWER_OEDIT_IMP_POWER',
      }),
    );
  });
});

describe("object power gates - full powers", () => {
  beforeAll(async () => {
    for (const vnum of [190, 191, 192, 193, 194, 195]) {
      await post("/api/objects", testCookie, { vnum });
    }
  });

  test("with all powers: all restricted fields persist", async () => {
    const ITEM_WEAPON = 5;
    const PROTOTYPE_BIT = 1 << 4;

    // testbuilder has all powers - every restricted field should persist
    const putRes = await put("/api/objects/190", testCookie, {
      ...baseObjPayload,
      action_flag: PROTOTYPE_BIT,
      affects: [{ mod1: 5, mod2: 0, type: 18, vnum: 190 }],
      price: 500,
      spec_proc: 5,
      type: ITEM_WEAPON,
      val0: 10,
      val1: 20,
      val2: 30,
      val3: 40,
      vnum: 190,
    });
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/objects/190", testCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        action_flag: PROTOTYPE_BIT,
        price: 500,
        spec_proc: 5,
        type: ITEM_WEAPON,
        val0: 10,
        val1: 20,
        val2: 30,
        val3: 40,
        vnum: 190,
      }),
    );
    expect(body).toHaveProperty(
      "affects",
      expect.arrayContaining([expect.objectContaining({ mod1: 5, type: 18 })]),
    );
  });
});

// ---------------------------------------------------------------------------
// Mob power gates (otherbuilder lacks MEDIT_IMP_POWER)
// ---------------------------------------------------------------------------

describe("mob power gates", () => {
  beforeAll(async () => {
    await post("/api/mobs", otherCookie, { vnum: 196 });
  });

  test("without MEDIT_IMP_POWER: unassignable spec_proc is silently reverted", async () => {
    // spec_proc 3 is unassignable for mobs - should be rejected with 403
    const putRes = await put("/api/mobs/196", otherCookie, {
      ...baseMobPayload,
      spec_proc: 3,
      vnum: 196,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error:
          'Changing "spec_proc" to an unassignable value requires POWER_MEDIT_IMP_POWER',
      }),
    );
  });
});

describe("mob power gates - full powers", () => {
  beforeAll(async () => {
    await post("/api/mobs", testCookie, { vnum: 196 });
  });

  test("with MEDIT_IMP_POWER: unassignable spec_proc persists", async () => {
    const putRes = await put("/api/mobs/196", testCookie, {
      ...baseMobPayload,
      spec_proc: 3,
      vnum: 196,
    });
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/mobs/196", testCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec_proc: 3, vnum: 196 }));
  });
});

// ---------------------------------------------------------------------------
// Room power gates (otherbuilder lacks REDIT_ENABLED)
// ---------------------------------------------------------------------------

describe("room power gates", () => {
  beforeAll(async () => {
    await post("/api/rooms", otherCookie, { vnum: 197 });
  });

  test("without REDIT_ENABLED: unassignable room spec is silently reverted", async () => {
    // spec 1 is unassignable - should be rejected with 403
    const putRes = await put("/api/rooms/197", otherCookie, {
      ...baseRoomPayload,
      spec: 1,
      vnum: 197,
    });
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error:
          'Changing "spec" to an unassignable value requires POWER_REDIT_ENABLED',
      }),
    );
  });

  test("without REDIT_ENABLED: assignable room spec persists", async () => {
    // spec 33 (blazingroom) is assignable without REDIT_ENABLED
    const putRes = await put("/api/rooms/197", otherCookie, {
      ...baseRoomPayload,
      spec: 33,
      vnum: 197,
    });
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/rooms/197", otherCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec: 33, vnum: 197 }));
  });
});

describe("room power gates - full powers", () => {
  beforeAll(async () => {
    await post("/api/rooms", testCookie, { vnum: 197 });
  });

  test("with REDIT_ENABLED: unassignable room spec persists", async () => {
    const putRes = await put("/api/rooms/197", testCookie, {
      ...baseRoomPayload,
      spec: 1,
      vnum: 197,
    });
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/rooms/197", testCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec: 1, vnum: 197 }));
  });
});
