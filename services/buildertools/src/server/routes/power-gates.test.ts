import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import {
  authRequest,
  cleanupTestVnums,
  getAuthCookie,
  otherUser,
  postJson,
  putJson,
  validMobPayload,
  validObjPayload,
  validRoomPayload,
} from "../test-helpers.ts";

// Vnums 190-199 reserved for power gate tests (otherbuilder/testbuilder)
// Vnums 200-205 reserved for senior bypass tests (expandedbuilder)
let testCookie: string; // testbuilder - all powers
let otherCookie: string; // otherbuilder - partial powers (no OEDIT_COST, OEDIT_APPLYS, OEDIT_WEAPONS, OEDIT_NOPROTOS, OEDIT_IMP_POWER, MEDIT_IMP_POWER, REDIT_ENABLED)
let seniorCookie: string; // expandedbuilder - senior (isSenior=true), lacks OEDIT_COST, OEDIT_WEAPONS, OEDIT_IMP_POWER, MEDIT_IMP_POWER, REDIT_ENABLED

beforeAll(async () => {
  testCookie = await getAuthCookie(app, "testbuilder");
  otherCookie = await getAuthCookie(app, "otherbuilder");
  seniorCookie = await getAuthCookie(app, "expandedbuilder");
});

afterAll(() =>
  cleanupTestVnums({
    db: immortalDb,
    vnums: [
      190, 191, 192, 193, 194, 195, 196, 197, 198, 200, 201, 202, 203, 204, 205,
    ],
  }),
);

function get(path: string, cookie: string) {
  return authRequest(app, path, cookie);
}

describe("object power gates", () => {
  beforeAll(async () => {
    for (const vnum of [190, 191, 192, 193, 194, 195]) {
      await postJson(app, "/api/objects", otherCookie, { vnum });
    }
  });

  test("without OEDIT_COST: changing price is rejected", async () => {
    const putRes = await putJson(
      app,
      "/api/objects/190",
      otherCookie,
      validObjPayload({ price: 500, vnum: 190 }),
    );
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: 'Changing "price" requires POWER_OEDIT_COST',
      }),
    );
  });

  test("without OEDIT_APPLYS: changing affects is rejected", async () => {
    const putRes = await putJson(
      app,
      "/api/objects/191",
      otherCookie,
      validObjPayload({
        affects: [{ mod1: 5, mod2: 0, type: 18, vnum: 191 }],
        vnum: 191,
      }),
    );
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: 'Changing "affects" requires POWER_OEDIT_APPLYS',
      }),
    );
  });

  test("without OEDIT_WEAPONS: changing weapon val0-val3 is rejected", async () => {
    const ITEM_WEAPON = 5;

    // type is non-gated; this setup must succeed before the weapon-values PUT below.
    await putJson(
      app,
      "/api/objects/192",
      otherCookie,
      validObjPayload({ type: ITEM_WEAPON, vnum: 192 }),
    );

    const putRes = await putJson(
      app,
      "/api/objects/192",
      otherCookie,
      validObjPayload({
        type: ITEM_WEAPON,
        val0: 10,
        val1: 20,
        val2: 30,
        val3: 40,
        vnum: 192,
      }),
    );
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

    // Bypass the gate to seed the bit (simulating a higher-power builder set it).
    await immortalDb.execute(
      sql`UPDATE obj SET action_flag = ${PROTOTYPE_BIT} WHERE vnum = 193 AND player_id = 99997`,
    );

    const putRes = await putJson(
      app,
      "/api/objects/193",
      otherCookie,
      validObjPayload({ action_flag: 0, vnum: 193 }),
    );
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

    const putRes = await putJson(
      app,
      "/api/objects/194",
      otherCookie,
      validObjPayload({ action_flag: PROTOTYPE_BIT, vnum: 194 }),
    );
    expect(putRes.status).toBe(403);
    const body: unknown = await putRes.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: "Changing the prototype flag requires POWER_OEDIT_NOPROTOS",
      }),
    );
  });

  test("without OEDIT_IMP_POWER: setting unassignable spec_proc is rejected", async () => {
    // spec_proc 5 is unassignable for objects.
    const putRes = await putJson(
      app,
      "/api/objects/195",
      otherCookie,
      validObjPayload({ spec_proc: 5, vnum: 195 }),
    );
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

describe("object power gates - unchanged value passes through", () => {
  test("without OEDIT_COST: saving with unchanged price succeeds", async () => {
    // Object 190 was created with price=0; resaving price=0 must not trip the gate.
    const putRes = await putJson(
      app,
      "/api/objects/190",
      otherCookie,
      validObjPayload({ name: "renamed object", price: 0, vnum: 190 }),
    );
    expect(putRes.status).toBe(200);

    // The rename must persist - the gate must not have blocked the entire save.
    const getRes = await get("/api/objects/190", otherCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(
      expect.objectContaining({ name: "renamed object", price: 0, vnum: 190 }),
    );
  });
});

describe("object power gates - type-specific bypass", () => {
  // type=1 is ITEM_LIGHT - the OEDIT_WEAPONS gate must only fire for type=5 (weapons).
  beforeAll(() =>
    putJson(
      app,
      "/api/objects/194",
      otherCookie,
      validObjPayload({ type: 1, vnum: 194 }),
    ),
  );

  test("without OEDIT_WEAPONS: changing val0 on non-weapon type succeeds", async () => {
    const putRes = await putJson(
      app,
      "/api/objects/194",
      otherCookie,
      validObjPayload({ type: 1, val0: 99, vnum: 194 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/objects/194", otherCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(
      expect.objectContaining({ type: 1, val0: 99, vnum: 194 }),
    );
  });
});

describe("object power gates - full powers", () => {
  beforeAll(async () => {
    for (const vnum of [190, 191, 192, 193, 194, 195]) {
      await postJson(app, "/api/objects", testCookie, { vnum });
    }
  });

  test("with all powers: all restricted fields persist", async () => {
    const ITEM_WEAPON = 5;
    const PROTOTYPE_BIT = 1 << 4;

    const putRes = await putJson(
      app,
      "/api/objects/190",
      testCookie,
      validObjPayload({
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
      }),
    );
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

describe("mob power gates", () => {
  beforeAll(() => postJson(app, "/api/mobs", otherCookie, { vnum: 196 }));

  test("without MEDIT_IMP_POWER: setting unassignable spec_proc is rejected", async () => {
    // spec_proc 3 is unassignable for mobs.
    const putRes = await putJson(
      app,
      "/api/mobs/196",
      otherCookie,
      validMobPayload({ spec_proc: 3, vnum: 196 }),
    );
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
  beforeAll(() => postJson(app, "/api/mobs", testCookie, { vnum: 196 }));

  test("with MEDIT_IMP_POWER: unassignable spec_proc persists", async () => {
    const putRes = await putJson(
      app,
      "/api/mobs/196",
      testCookie,
      validMobPayload({ spec_proc: 3, vnum: 196 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/mobs/196", testCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec_proc: 3, vnum: 196 }));
  });
});

describe("room power gates", () => {
  beforeAll(() => postJson(app, "/api/rooms", otherCookie, { vnum: 197 }));

  test("without REDIT_ENABLED: setting unassignable room spec is rejected", async () => {
    // spec 1 is unassignable.
    const putRes = await putJson(
      app,
      "/api/rooms/197",
      otherCookie,
      validRoomPayload({ spec: 1, vnum: 197 }),
    );
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
    // spec 33 (blazingroom) is assignable without REDIT_ENABLED.
    const putRes = await putJson(
      app,
      "/api/rooms/197",
      otherCookie,
      validRoomPayload({ spec: 33, vnum: 197 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/rooms/197", otherCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec: 33, vnum: 197 }));
  });
});

describe("room power gates - unchanged value passes through", () => {
  test("without REDIT_ENABLED: saving with unchanged unassignable spec succeeds", async () => {
    // Mirror of the object-price unchanged pass-through test. Create a room,
    // bypass the gate via direct SQL to set an unassignable spec (as if an
    // admin or a senior had set it previously), then have otherbuilder save
    // the room without touching spec. The gate should not fire on unchanged
    // values - otherwise non-REDIT_ENABLED builders would be blocked from
    // editing any legacy room that already has an unassignable spec.
    const vnum = 198;
    await postJson(app, "/api/rooms", otherCookie, { vnum });
    await immortalDb.execute(sql`
      UPDATE room SET spec = 1 WHERE vnum = ${vnum} AND player_id = ${otherUser.playerId}
    `);
    const putRes = await putJson(
      app,
      `/api/rooms/${vnum}`,
      otherCookie,
      validRoomPayload({ name: "renamed room", spec: 1, vnum }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get(`/api/rooms/${vnum}`, otherCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(
      expect.objectContaining({ name: "renamed room", spec: 1, vnum }),
    );
  });
});

describe("room power gates - full powers", () => {
  beforeAll(() => postJson(app, "/api/rooms", testCookie, { vnum: 197 }));

  test("with REDIT_ENABLED: unassignable room spec persists", async () => {
    const putRes = await putJson(
      app,
      "/api/rooms/197",
      testCookie,
      validRoomPayload({ spec: 1, vnum: 197 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/rooms/197", testCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec: 1, vnum: 197 }));
  });
});

describe("senior users bypass power gates", () => {
  beforeAll(async () => {
    await postJson(app, "/api/objects", seniorCookie, { vnum: 200 });
    await postJson(app, "/api/objects", seniorCookie, { vnum: 201 });
    await postJson(app, "/api/mobs", seniorCookie, { vnum: 202 });
    await postJson(app, "/api/rooms", seniorCookie, { vnum: 203 });
    await postJson(app, "/api/objects", seniorCookie, { vnum: 204 });
    return postJson(app, "/api/objects", seniorCookie, { vnum: 205 });
  });

  test("senior can change object price without OEDIT_COST", async () => {
    const putRes = await putJson(
      app,
      "/api/objects/200",
      seniorCookie,
      validObjPayload({ price: 999, vnum: 200 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/objects/200", seniorCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ price: 999, vnum: 200 }));
  });

  test("senior can change weapon values without OEDIT_WEAPONS", async () => {
    const ITEM_WEAPON = 5;
    const putRes = await putJson(
      app,
      "/api/objects/201",
      seniorCookie,
      validObjPayload({ type: ITEM_WEAPON, val0: 42, vnum: 201 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/objects/201", seniorCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(
      expect.objectContaining({ type: ITEM_WEAPON, val0: 42, vnum: 201 }),
    );
  });

  test("senior can set unassignable mob spec_proc without MEDIT_IMP_POWER", async () => {
    const putRes = await putJson(
      app,
      "/api/mobs/202",
      seniorCookie,
      validMobPayload({ spec_proc: 3, vnum: 202 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/mobs/202", seniorCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec_proc: 3, vnum: 202 }));
  });

  test("senior can set unassignable room spec without REDIT_ENABLED", async () => {
    const putRes = await putJson(
      app,
      "/api/rooms/203",
      seniorCookie,
      validRoomPayload({ spec: 1, vnum: 203 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/rooms/203", seniorCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(expect.objectContaining({ spec: 1, vnum: 203 }));
  });

  test("senior can change affects without OEDIT_APPLYS", async () => {
    const putRes = await putJson(
      app,
      "/api/objects/204",
      seniorCookie,
      validObjPayload({
        affects: [{ mod1: 5, mod2: 0, type: 18, vnum: 204 }],
        vnum: 204,
      }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/objects/204", seniorCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toHaveProperty(
      "affects",
      expect.arrayContaining([expect.objectContaining({ mod1: 5, type: 18 })]),
    );
  });

  test("senior can change prototype flag without OEDIT_NOPROTOS", async () => {
    const PROTOTYPE_BIT = 1 << 4;
    const putRes = await putJson(
      app,
      "/api/objects/205",
      seniorCookie,
      validObjPayload({ action_flag: PROTOTYPE_BIT, vnum: 205 }),
    );
    expect(putRes.status).toBe(200);

    const getRes = await get("/api/objects/205", seniorCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toEqual(
      expect.objectContaining({ action_flag: PROTOTYPE_BIT, vnum: 205 }),
    );
  });
});
