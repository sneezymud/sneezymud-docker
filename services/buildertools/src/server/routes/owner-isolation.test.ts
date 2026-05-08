import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import {
  authRequest,
  bulkDelJson,
  cleanupTestVnums,
  delJson,
  getAuthCookie,
  postJson,
  putJson,
  validMobPayload,
  validObjPayload,
  validRoomPayload,
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
  cookieA = await getAuthCookie(app, "testbuilder");
  cookieB = await getAuthCookie(app, "otherbuilder");
});

afterAll(() =>
  cleanupTestVnums({
    db: immortalDb,
    vnums: [
      MOB_SHARED,
      MOB_B_ONLY,
      ROOM_SHARED,
      ROOM_B_ONLY,
      OBJ_SHARED,
      OBJ_B_ONLY,
      RESP_SHARED,
      RESP_B_ONLY,
    ],
  }),
);

describe("mob owner isolation", () => {
  test("two builders can create the same vnum independently", async () => {
    const resA = await postJson(app, "/api/mobs", cookieA, {
      vnum: MOB_SHARED,
    });
    expect(resA.status).toBe(201);

    const resB = await postJson(app, "/api/mobs", cookieB, {
      vnum: MOB_SHARED,
    });
    expect(resB.status).toBe(201);

    const getA = await authRequest(app, `/api/mobs/${MOB_SHARED}`, cookieA);
    const getB = await authRequest(app, `/api/mobs/${MOB_SHARED}`, cookieB);
    expect(getA.status).toBe(200);
    expect(getB.status).toBe(200);
    const bodyA: unknown = await getA.json();
    const bodyB: unknown = await getB.json();
    expect(bodyA).toEqual(expect.objectContaining({ vnum: MOB_SHARED }));
    expect(bodyB).toEqual(expect.objectContaining({ vnum: MOB_SHARED }));
  });

  test("non-senior builder cannot use ?owner=all", async () => {
    const res = await authRequest(app, "/api/mobs?owner=all", cookieA);
    expect(res.status).toBe(403);
  });

  test("builder A cannot see builder B's entity", async () => {
    await postJson(app, "/api/mobs", cookieB, { vnum: MOB_B_ONLY });

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
    const res = await putJson(
      app,
      `/api/mobs/${MOB_B_ONLY}`,
      cookieA,
      validMobPayload({ name: "hacked", vnum: MOB_B_ONLY }),
    );
    expect(res.status).toBe(404);
  });

  test("builder A cannot delete builder B's entity", async () => {
    const res = await delJson(app, `/api/mobs/${MOB_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);

    const check = await authRequest(app, `/api/mobs/${MOB_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });

  test("updating own entity does not affect other builder's copy", async () => {
    // Both builders already have MOB_SHARED (180) from earlier tests; seed
    // distinct names so the update vs read assertions can prove isolation.
    await putJson(
      app,
      `/api/mobs/${MOB_SHARED}`,
      cookieA,
      validMobPayload({
        name: "builder A mob",
        short_desc: "a builder A mob",
        vnum: MOB_SHARED,
      }),
    );
    await putJson(
      app,
      `/api/mobs/${MOB_SHARED}`,
      cookieB,
      validMobPayload({
        name: "builder B mob",
        short_desc: "a builder B mob",
        vnum: MOB_SHARED,
      }),
    );

    await putJson(
      app,
      `/api/mobs/${MOB_SHARED}`,
      cookieA,
      validMobPayload({
        name: "builder A mob UPDATED",
        short_desc: "a builder A mob updated",
        vnum: MOB_SHARED,
      }),
    );

    const bRes = await authRequest(app, `/api/mobs/${MOB_SHARED}`, cookieB);
    expect(bRes.status).toBe(200);
    const bBody: unknown = await bRes.json();
    expect(bBody).toHaveProperty("name", "builder B mob");
    expect(bBody).toHaveProperty("short_desc", "a builder B mob");
  });

  test("bulk delete only affects own entities", async () => {
    const res = await bulkDelJson(app, "/api/mobs/bulk", cookieA, [
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

describe("room owner isolation", () => {
  test("two builders can create the same vnum independently", async () => {
    const resA = await postJson(app, "/api/rooms", cookieA, {
      vnum: ROOM_SHARED,
    });
    expect(resA.status).toBe(201);

    const resB = await postJson(app, "/api/rooms", cookieB, {
      vnum: ROOM_SHARED,
    });
    expect(resB.status).toBe(201);
  });

  test("builder A cannot see builder B's room", async () => {
    await postJson(app, "/api/rooms", cookieB, { vnum: ROOM_B_ONLY });

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
    const res = await putJson(
      app,
      `/api/rooms/${ROOM_B_ONLY}`,
      cookieA,
      validRoomPayload({ name: "hacked", vnum: ROOM_B_ONLY }),
    );
    expect(res.status).toBe(404);
  });

  test("builder A cannot delete builder B's room", async () => {
    const res = await delJson(app, `/api/rooms/${ROOM_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);

    const check = await authRequest(app, `/api/rooms/${ROOM_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });

  test("bulk delete only affects own rooms", async () => {
    const res = await bulkDelJson(app, "/api/rooms/bulk", cookieA, [
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

describe("object owner isolation", () => {
  test("two builders can create the same vnum independently", async () => {
    const resA = await postJson(app, "/api/objects", cookieA, {
      vnum: OBJ_SHARED,
    });
    expect(resA.status).toBe(201);

    const resB = await postJson(app, "/api/objects", cookieB, {
      vnum: OBJ_SHARED,
    });
    expect(resB.status).toBe(201);
  });

  test("builder A cannot see builder B's object", async () => {
    await postJson(app, "/api/objects", cookieB, { vnum: OBJ_B_ONLY });

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
    const res = await putJson(
      app,
      `/api/objects/${OBJ_B_ONLY}`,
      cookieA,
      validObjPayload({ name: "hacked", vnum: OBJ_B_ONLY }),
    );
    expect(res.status).toBe(404);
  });

  test("builder A cannot delete builder B's object", async () => {
    const res = await delJson(app, `/api/objects/${OBJ_B_ONLY}`, cookieA);
    expect(res.status).toBe(404);

    const check = await authRequest(app, `/api/objects/${OBJ_B_ONLY}`, cookieB);
    expect(check.status).toBe(200);
  });

  test("bulk delete only affects own objects", async () => {
    const res = await bulkDelJson(app, "/api/objects/bulk", cookieA, [
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

describe("mob response owner isolation", () => {
  beforeAll(async () => {
    // Mob row must exist before mob_responses can be set; seed both builders
    // at the shared vnum and only B at the B-only vnum.
    await postJson(app, "/api/mobs", cookieA, { vnum: RESP_SHARED });
    await postJson(app, "/api/mobs", cookieB, { vnum: RESP_SHARED });
    await postJson(app, "/api/mobs", cookieB, { vnum: RESP_B_ONLY });

    await putJson(app, `/api/mob-responses/${RESP_SHARED}`, cookieB, {
      response: 'say {"hello from B";}',
      vnum: RESP_SHARED,
    });
    return putJson(app, `/api/mob-responses/${RESP_B_ONLY}`, cookieB, {
      response: 'say {"secret";}',
      vnum: RESP_B_ONLY,
    });
  });

  test("builder A cannot see builder B's mob response", async () => {
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
    const putRes = await putJson(
      app,
      `/api/mob-responses/${RESP_SHARED}`,
      cookieA,
      {
        response: 'say {"hello from A";}',
        vnum: RESP_SHARED,
      },
    );
    expect(putRes.status).toBe(200);

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
