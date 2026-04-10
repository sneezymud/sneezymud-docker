import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { objSchema } from "@/shared/schemas/obj.ts";

import { app } from "../app.ts";
import { immortalDb, sneezyDb } from "../db.ts";
import { authRequest, getAuthCookie, testUser } from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app, "testbuilder");
});

afterAll(async () => {
  await immortalDb.execute(
    sql`DELETE FROM objaffect WHERE vnum IN (110, 111, 112, 113, 114, 115, 116, 144, 145, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 180, 181, 500)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM objextra WHERE vnum IN (110, 111, 112, 113, 114, 115, 116, 144, 145, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 180, 181)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM obj WHERE vnum IN (110, 111, 112, 113, 114, 115, 116, 144, 145, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 180, 181)`,
  );
  await sneezyDb.execute(sql`DELETE FROM obj WHERE vnum IN (5100, 5101, 5102)`);
  await sneezyDb.execute(sql`DELETE FROM obj WHERE vnum BETWEEN 6100 AND 6124`);
});

// -- Auth enforcement --

describe("auth enforcement", () => {
  test("unauthenticated request returns 401", async () => {
    const res = await app.request("/api/objects", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    expect(res.status).toBe(401);
  });

  test("request without X-Requested-With returns 403", async () => {
    const res = await app.request("/api/objects", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});

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
  name: "",
  price: 0,
  short_desc: "",
  spec_proc: 0,
  type: 0,
  val0: 0,
  val1: 0,
  val2: 0,
  val3: 0,
  vnum: 110,
  volume: 0,
  wear_flag: 0,
  weight: 0,
};

// -- Invalid vnum parameters --

describe("invalid vnum parameters", () => {
  test("GET /api/objects/abc returns 400", async () => {
    const res = await authRequest(app, "/api/objects/abc", cookie);
    expect(res.status).toBe(400);
  });

  test("GET /api/objects/-1 returns 400", async () => {
    const res = await authRequest(app, "/api/objects/-1", cookie);
    expect(res.status).toBe(400);
  });

  test("PUT /api/objects/abc returns 400", async () => {
    const res = await authRequest(app, "/api/objects/abc", cookie, {
      body: JSON.stringify(validObjUpdate),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});

// -- Create --

describe("object creation", () => {
  test("builder can create an object within their blocks", async () => {
    const res = await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 110 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("vnum", 110);
  });

  test("creating an object at an existing vnum returns 409", async () => {
    const res = await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 110 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(409);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Object already exists");
  });

  test("creating an object outside assigned blocks returns 403", async () => {
    const res = await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 500 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(403);
  });
});

// -- Read --

describe("object listing and fetching", () => {
  test("builder can list their objects", async () => {
    const res = await authRequest(app, "/api/objects", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toBeInstanceOf(Array);
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 110 })]),
    );
  });

  test("builder can fetch a specific object with affects and extras", async () => {
    const res = await authRequest(app, "/api/objects/110", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("vnum", 110);
    expect(body).toHaveProperty("affects");
    expect(body).toHaveProperty("extras");
  });

  test("fetching an object outside blocks returns 403", async () => {
    const res = await authRequest(app, "/api/objects/500", cookie);

    expect(res.status).toBe(403);
  });

  test("fetching a nonexistent object within blocks returns 404", async () => {
    const res = await authRequest(app, "/api/objects/199", cookie);

    expect(res.status).toBe(404);
  });
});

// -- Update --

describe("object updates", () => {
  test("builder can update an object with affects and extras roundtrip", async () => {
    const updated = {
      ...validObjUpdate,
      affects: [{ mod1: 1, mod2: 0, type: 18, vnum: 110 }],
      extras: [
        {
          description: "A finely crafted blade.",
          name: "blade sword",
          vnum: 110,
        },
      ],
      name: "sword blade",
      short_desc: "a sharp sword",
    };

    const putRes = await authRequest(app, "/api/objects/110", cookie, {
      body: JSON.stringify(updated),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(putRes.status).toBe(200);
    const getRes = await authRequest(app, "/api/objects/110", cookie);
    const body: unknown = await getRes.json();
    const parsed = objSchema.parse(body);
    expect(parsed.name).toBe("sword blade");
    expect(parsed.short_desc).toBe("a sharp sword");
    expect(parsed.affects).toHaveLength(1);
    expect(parsed.affects[0]?.mod1).toBe(1);
    expect(parsed.affects[0]?.type).toBe(18);
    expect(parsed.extras).toHaveLength(1);
    expect(parsed.extras[0]?.name).toBe("blade sword");
  });

  test("updating a nonexistent object within blocks returns 404", async () => {
    const res = await authRequest(app, "/api/objects/198", cookie, {
      body: JSON.stringify({ ...validObjUpdate, vnum: 198 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(404);
  });

  test("invalid request body gets rejected", async () => {
    const res = await authRequest(app, "/api/objects/110", cookie, {
      body: JSON.stringify({ name: "missing required fields" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(400);
  });

  test("update replaces child rows instead of appending", async () => {
    // Object 110 already has 1 affect and 1 extra from roundtrip test
    const putRes = await authRequest(app, "/api/objects/110", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        affects: [],
        extras: [],
        vnum: 110,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const res = await authRequest(app, "/api/objects/110", cookie);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("affects", []);
    expect(body).toHaveProperty("extras", []);
  });
});

// -- Delete --

describe("object deletion", () => {
  test("builder can delete an object", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 160 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/objects/160", cookie, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);

    const getRes = await authRequest(app, "/api/objects/160", cookie);
    expect(getRes.status).toBe(404);
  });

  test("deleting a nonexistent object returns 404", async () => {
    const res = await authRequest(app, "/api/objects/198", cookie, {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });
});

// -- Search --

describe("object search", () => {
  beforeAll(async () => {
    // Create a named object for search
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 111 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/objects/111", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        short_desc: "a glowing orb of light",
        vnum: 111,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Insert a sneezy object for cross-database search
    await sneezyDb.execute(sql`
      INSERT INTO obj (vnum, name, short_desc, long_desc, action_desc)
      VALUES (5100, 'dagger', 'a production dagger', '', '')
    `);
  });

  test("search finds objects by short_desc", async () => {
    const res = await authRequest(
      app,
      "/api/objects/search?q=glowing+orb",
      cookie,
    );

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 111 })]),
    );
    // Object 110 exists but doesn't match "glowing orb"
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 110 })]),
    );
  });

  test("short query returns empty array", async () => {
    const res = await authRequest(app, "/api/objects/search?q=x", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });

  test("SQL metacharacters in query are treated literally", async () => {
    // Create an object with % in the short_desc
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 112 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/objects/112", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        short_desc: "a 100% pure gold ring",
        vnum: 112,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Searching for literal "%" should match the specific object
    const res = await authRequest(
      app,
      "/api/objects/search?q=100%25+pure",
      cookie,
    );

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 112 })]),
    );

    // Searching for "_" should not wildcard-match single characters
    const underscoreRes = await authRequest(
      app,
      "/api/objects/search?q=10_+pure",
      cookie,
    );
    const underscoreBody: unknown = await underscoreRes.json();
    expect(underscoreBody).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 112 })]),
    );
  });

  // Search crosses block boundaries intentionally - key pickers need
  // to find objects across all builders' blocks and the production database.
  test("search finds object by numeric vnum", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 144 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/objects/144", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        short_desc: "a vnum search test object",
        vnum: 144,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const res = await authRequest(app, "/api/objects/search?q=144", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 144 })]),
    );
  });

  test("search finds objects in sneezy database too", async () => {
    const res = await authRequest(
      app,
      "/api/objects/search?q=production+dagger",
      cookie,
    );

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 5100 })]),
    );
  });
});

// -- Name lookup --

describe("object name lookup", () => {
  beforeAll(async () => {
    await sneezyDb.execute(sql`
      INSERT IGNORE INTO obj (vnum, name, short_desc, long_desc, action_desc)
      VALUES (5101, 'shield', 'a cross-block shield', '', '')
    `);
  });

  // Name lookup intentionally bypasses block access checks - key fields
  // reference objects in other builders' blocks and need to display names.
  test("returns name for object outside builder blocks", async () => {
    const res = await authRequest(app, "/api/objects/name/5101", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ name: "a cross-block shield", vnum: 5101 }),
    );
  });

  test("returns null name for nonexistent object", async () => {
    const res = await authRequest(app, "/api/objects/name/49999", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ name: null, vnum: 49_999 }));
  });
});

describe("bulk object deletion", () => {
  test("builder can bulk delete multiple objects", async () => {
    for (const vnum of [161, 162]) {
      await authRequest(app, "/api/objects", cookie, {
        body: JSON.stringify({ vnum }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    }

    const res = await authRequest(app, "/api/objects/bulk", cookie, {
      body: JSON.stringify({ vnums: [161, 162] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 2, ok: true });

    const get161 = await authRequest(app, "/api/objects/161", cookie);
    const get162 = await authRequest(app, "/api/objects/162", cookie);
    expect(get161.status).toBe(404);
    expect(get162.status).toBe(404);
  });

  test("rejects vnums outside assigned blocks", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 161 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/objects/bulk", cookie, {
      body: JSON.stringify({ vnums: [161, 500] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(403);

    const getRes = await authRequest(app, "/api/objects/161", cookie);
    expect(getRes.status).toBe(200);
  });

  test("empty array rejected by validation", async () => {
    const res = await authRequest(app, "/api/objects/bulk", cookie, {
      body: JSON.stringify({ vnums: [] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(400);
  });

  test("non-existent vnums succeed silently", async () => {
    const res = await authRequest(app, "/api/objects/bulk", cookie, {
      body: JSON.stringify({ vnums: [198, 199] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 0, ok: true });
  });

  test("bulk delete with owner parameter returns 400", async () => {
    const res = await authRequest(
      app,
      "/api/objects/bulk?owner=99999",
      cookie,
      {
        body: JSON.stringify({ vnums: [110] }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      },
    );
    expect(res.status).toBe(400);
  });
});

// -- Schema read/write split --

describe("out-of-range data readable from DB", () => {
  test("GET returns object with values outside input constraints", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 165 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // Set can_be_seen to 50 directly in DB (outside input range 0-25)
    await immortalDb.execute(
      sql`UPDATE obj SET can_be_seen = 50 WHERE vnum = 165`,
    );

    const res = await authRequest(app, "/api/objects/165", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ can_be_seen: 50, vnum: 165 }),
    );
  });

  test("PUT rejects values outside input constraints", async () => {
    const res = await authRequest(app, "/api/objects/165", cookie, {
      body: JSON.stringify({ ...validObjUpdate, can_be_seen: 50, vnum: 165 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});

// -- Delete cascades --

describe("delete cascades to child tables", () => {
  test("re-created object has no orphaned affects or extras", async () => {
    // Create object and populate child rows
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 113 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/objects/113", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        affects: [{ mod1: 5, mod2: 0, type: 1, vnum: 113 }],
        extras: [{ description: "old extra", name: "old", vnum: 113 }],
        vnum: 113,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Delete and re-create
    await authRequest(app, "/api/objects/113", cookie, { method: "DELETE" });
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 113 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/objects/113", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("affects", []);
    expect(body).toHaveProperty("extras", []);
  });
});

// -- Update with change --

describe("update preserves unchanged fields", () => {
  test("changing type preserves affects and extras", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 114 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const sharedAffects = [{ mod1: 2, mod2: 0, type: 18, vnum: 114 }];
    const sharedExtras = [
      { description: "It glows faintly.", name: "glow light", vnum: 114 },
    ];

    // Save as weapon (type=5) with affects and extras
    await authRequest(app, "/api/objects/114", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        affects: sharedAffects,
        extras: sharedExtras,
        name: "glowing blade",
        short_desc: "a glowing blade",
        type: 5,
        vnum: 114,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Change to light (type=1), keep affects and extras
    const putRes = await authRequest(app, "/api/objects/114", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        affects: sharedAffects,
        extras: sharedExtras,
        name: "glowing blade",
        short_desc: "a glowing blade",
        type: 1,
        vnum: 114,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const res = await authRequest(app, "/api/objects/114", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ type: 1, vnum: 114 }));
    expect(body).toHaveProperty(
      "affects",
      expect.arrayContaining([expect.objectContaining({ mod1: 2, type: 18 })]),
    );
    expect(body).toHaveProperty(
      "extras",
      expect.arrayContaining([expect.objectContaining({ name: "glow light" })]),
    );
  });
});

// -- Idempotency --

describe("save idempotency", () => {
  test("saving the same payload twice produces identical data", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 115 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = {
      ...validObjUpdate,
      affects: [{ mod1: 5, mod2: 0, type: 1, vnum: 115 }],
      extras: [{ description: "a shiny gem", name: "gem", vnum: 115 }],
      name: "idempotent sword",
      short_desc: "an idempotent sword",
      type: 5,
      vnum: 115,
    };

    // First save
    await authRequest(app, "/api/objects/115", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const getA = await authRequest(app, "/api/objects/115", cookie);
    expect(getA.status).toBe(200);
    const snapshotA: unknown = await getA.json();
    // Validate shape through Zod
    const parsedA = objSchema.parse(snapshotA);

    // Second save (identical payload)
    await authRequest(app, "/api/objects/115", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const getB = await authRequest(app, "/api/objects/115", cookie);
    expect(getB.status).toBe(200);
    const snapshotB: unknown = await getB.json();
    const parsedB = objSchema.parse(snapshotB);

    // Full deep equality - no duplicate child rows, no changed values
    expect(parsedB).toEqual(parsedA);
  });
});

// -- Schema validation --

describe("response schema validation", () => {
  test("GET object response conforms to objSchema", async () => {
    const res = await authRequest(app, "/api/objects/114", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = objSchema.parse(body);
    expect(parsed.vnum).toBe(114);
  });

  test("populated object with child rows and non-default type conforms to objSchema", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 116 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await authRequest(app, "/api/objects/116", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        affects: [{ mod1: 3, mod2: 0, type: 17, vnum: 116 }],
        extras: [{ description: "Runes glow.", name: "runes", vnum: 116 }],
        name: "runic blade",
        price: 500,
        type: 5,
        val0: 100,
        vnum: 116,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const res = await authRequest(app, "/api/objects/116", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = objSchema.parse(body);
    expect(parsed.affects).toHaveLength(1);
    expect(parsed.extras).toHaveLength(1);
    expect(parsed.type).toBe(5);
    expect(parsed.price).toBe(500);
  });
});

// -- Full-field roundtrip --

describe("full-field roundtrip", () => {
  test("all fields survive a PUT/GET cycle", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 180 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = {
      action_desc: "It glows.",
      action_flag: 16,
      affects: [
        { mod1: 5, mod2: 0, type: 18, vnum: 180 },
        { mod1: -2, mod2: 0, type: 1, vnum: 180 },
      ],
      can_be_seen: 10,
      cur_struct: 100,
      decay: 500,
      extras: [{ description: "A glowing rune.", name: "rune", vnum: 180 }],
      long_desc: "A sword lies here.",
      material: 50,
      max_exist: 3,
      max_struct: 200,
      name: "magical sword",
      price: 5000,
      short_desc: "a magical sword",
      spec_proc: 0,
      type: 5,
      val0: 200 | (150 << 8),
      val1: 50 | (30 << 8),
      val2: 1 | (2 << 8),
      val3: 0,
      vnum: 180,
      volume: 1000,
      wear_flag: 8193,
      weight: 5,
    };

    const putRes = await authRequest(app, "/api/objects/180", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const getRes = await authRequest(app, "/api/objects/180", cookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    const parsed = objSchema.parse(body);

    expect(parsed.action_desc).toBe(payload.action_desc);
    expect(parsed.action_flag).toBe(payload.action_flag);
    expect(parsed.can_be_seen).toBe(payload.can_be_seen);
    expect(parsed.cur_struct).toBe(payload.cur_struct);
    expect(parsed.decay).toBe(payload.decay);
    expect(parsed.long_desc).toBe(payload.long_desc);
    expect(parsed.material).toBe(payload.material);
    expect(parsed.max_exist).toBe(payload.max_exist);
    expect(parsed.max_struct).toBe(payload.max_struct);
    expect(parsed.name).toBe(payload.name);
    expect(parsed.price).toBe(payload.price);
    expect(parsed.short_desc).toBe(payload.short_desc);
    expect(parsed.spec_proc).toBe(payload.spec_proc);
    expect(parsed.type).toBe(payload.type);
    expect(parsed.val0).toBe(payload.val0);
    expect(parsed.val1).toBe(payload.val1);
    expect(parsed.val2).toBe(payload.val2);
    expect(parsed.val3).toBe(payload.val3);
    expect(parsed.vnum).toBe(payload.vnum);
    expect(parsed.volume).toBe(payload.volume);
    expect(parsed.wear_flag).toBe(payload.wear_flag);
    expect(parsed.weight).toBe(payload.weight);

    expect(parsed.affects).toHaveLength(2);
    const affectTypes = parsed.affects
      .map((a) => a.type)
      .toSorted((a, b) => a - b);
    expect(affectTypes).toEqual([1, 18]);
    const affect18 = parsed.affects.find((a) => a.type === 18);
    expect(affect18?.mod1).toBe(5);
    expect(affect18?.mod2).toBe(0);
    const affect1 = parsed.affects.find((a) => a.type === 1);
    expect(affect1?.mod1).toBe(-2);
    expect(affect1?.mod2).toBe(0);

    expect(parsed.extras).toHaveLength(1);
    expect(parsed.extras[0]?.name).toBe("rune");
    expect(parsed.extras[0]?.description).toBe("A glowing rune.");
  });
});

// -- Object creation defaults --

describe("object creation defaults", () => {
  test("newly created object has zero/empty defaults", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 181 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/objects/181", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = objSchema.parse(body);

    expect(parsed.name).toBe("");
    expect(parsed.short_desc).toBe("");
    expect(parsed.type).toBe(0);
    expect(parsed.price).toBe(0);
    expect(parsed.weight).toBe(0);
    expect(parsed.affects).toEqual([]);
    expect(parsed.extras).toEqual([]);
  });
});

// -- Search pagination --

describe("object search pagination", () => {
  test("search returns at most 20 results", async () => {
    // Insert 25 objects in sneezy database with matching names
    for (let i = 0; i < 25; i++) {
      const vnum = 6100 + i;
      await sneezyDb.execute(sql`
        INSERT IGNORE INTO obj (vnum, name, short_desc, long_desc, action_desc)
        VALUES (${vnum}, ${"ObjPaginationTest " + String(i)}, '', '', '')
      `);
    }

    const res = await authRequest(
      app,
      "/api/objects/search?q=ObjPaginationTest",
      cookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (!Array.isArray(body)) throw new Error("expected array");
    expect(body.length).toBeLessThanOrEqual(20);
  });
});

// -- Search deduplication --

describe("search deduplication across databases", () => {
  beforeAll(async () => {
    // Insert an object in sneezy (production) with a distinctive name
    await sneezyDb.execute(sql`
      INSERT INTO obj (vnum, name, short_desc, long_desc, action_desc)
      VALUES (5102, 'DedupTestObj', 'a dedup test object', '', '')
    `);

    // Create the same vnum in immortal with a different name
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 169 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/objects/169", cookie, {
      body: JSON.stringify({
        ...validObjUpdate,
        short_desc: "an immortal dedup test object",
        vnum: 169,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
  });

  test("immortal version wins over sneezy for same vnum", async () => {
    // Insert a sneezy row at the same vnum as the immortal object
    await sneezyDb.execute(sql`
      INSERT IGNORE INTO obj (vnum, name, short_desc, long_desc, action_desc)
      VALUES (169, 'DedupConflict', 'a sneezy dedup conflict object', '', '')
    `);

    const res = await authRequest(app, "/api/objects/search?q=dedup", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (!Array.isArray(body)) throw new Error("expected array");

    const matches = body.filter((r: { vnum: number }) => r.vnum === 169);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toHaveProperty(
      "short_desc",
      "an immortal dedup test object",
    );
  });

  afterAll(async () => {
    await sneezyDb.execute(sql`DELETE FROM obj WHERE vnum = 169`);
  });
});

// -- Multiple affects ordering --

describe("multiple affects", () => {
  test("multiple affects are saved and returned with correct count and values", async () => {
    await authRequest(app, "/api/objects", cookie, {
      body: JSON.stringify({ vnum: 145 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const affects = [
      { mod1: 1, mod2: 0, type: 19, vnum: 145 },
      { mod1: 2, mod2: 0, type: 17, vnum: 145 },
      { mod1: 3, mod2: 0, type: 18, vnum: 145 },
    ];
    await authRequest(app, "/api/objects/145", cookie, {
      body: JSON.stringify({ ...validObjUpdate, affects, vnum: 145 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const res = await authRequest(app, "/api/objects/145", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    const parsed = objSchema.parse(body);
    expect(parsed.affects).toHaveLength(3);
    // Verify all three types are present (DB may return in any order)
    const types = parsed.affects.map((a) => a.type).toSorted((a, b) => a - b);
    expect(types).toEqual([17, 18, 19]);
  });
});

// -- Owner scoping --

/** Create an object in immortal via API and update it with full data. */
async function createAndUpdate(
  vnum: number,
  authCookie: string,
  updatePayload: Record<string, unknown>,
) {
  const createRes = await authRequest(app, "/api/objects", authCookie, {
    body: JSON.stringify({ vnum }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(createRes.status).toBe(201);

  const putRes = await authRequest(app, `/api/objects/${vnum}`, authCookie, {
    body: JSON.stringify({ ...updatePayload, vnum }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  expect(putRes.status).toBe(200);
}

describe("owner scoping", () => {
  let expandedCookie: string;
  let otherCookie: string;

  beforeAll(async () => {
    expandedCookie = await getAuthCookie(app, "expandedbuilder");
    otherCookie = await getAuthCookie(app, "otherbuilder");
  });

  test("GET /api/objects?owner=mine excludes other owners' entities", async () => {
    const vnumA = 163;
    const vnumB = 164;
    await createAndUpdate(vnumA, cookie, { ...validObjUpdate });
    await createAndUpdate(vnumB, otherCookie, { ...validObjUpdate });

    const res = await authRequest(app, "/api/objects?owner=mine", cookie);
    expect(res.status).toBe(200);
    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) throw new Error("expected array");
    const vnums = rows
      .filter(
        (r): r is { vnum: number } =>
          typeof r === "object" && r !== null && "vnum" in r,
      )
      .map((r) => r.vnum);
    expect(vnums).toContain(vnumA);
    expect(vnums).not.toContain(vnumB);
  });

  test("senior cross-owner GET returns target's draft", async () => {
    const vnum = 166;
    await createAndUpdate(vnum, cookie, {
      ...validObjUpdate,
      name: "test user object",
    });
    const res = await authRequest(
      app,
      `/api/objects/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("name", "test user object");
  });

  test("senior cross-owner PUT persists changes", async () => {
    // expandedUser (senior) edits testUser's object 166 - already created above
    const getRes = await authRequest(
      app,
      `/api/objects/166?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(getRes.status).toBe(200);
    const original: unknown = await getRes.json();
    if (typeof original !== "object" || original === null) {
      throw new Error("expected object");
    }

    const putRes = await authRequest(
      app,
      `/api/objects/166?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify({
          ...original,
          name: "senior edited object",
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(putRes.status).toBe(200);

    // Verify via GET that the change was actually saved
    const verifyRes = await authRequest(
      app,
      `/api/objects/166?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(verifyRes.status).toBe(200);
    const verifyBody: unknown = await verifyRes.json();
    expect(verifyBody).toHaveProperty("name", "senior edited object");
  });

  test("senior cross-owner DELETE removes target's row", async () => {
    const vnum = 167;
    await createAndUpdate(vnum, cookie, { ...validObjUpdate });
    const res = await authRequest(
      app,
      `/api/objects/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
      { method: "DELETE" },
    );
    expect(res.status).toBe(200);
    const getRes = await authRequest(app, `/api/objects/${vnum}`, cookie);
    expect(getRes.status).toBe(404);
  });

  test("non-senior ?owner= rejection on GET", async () => {
    const res = await authRequest(
      app,
      `/api/objects/163?owner=${testUser.playerId}`,
      otherCookie,
    );
    expect(res.status).toBe(403);
  });

  test("non-senior ?owner= rejection on PUT", async () => {
    const res = await authRequest(
      app,
      `/api/objects/163?owner=${testUser.playerId}`,
      otherCookie,
      {
        body: JSON.stringify({ ...validObjUpdate, vnum: 163 }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(res.status).toBe(403);
  });

  test("non-senior ?owner= rejection on DELETE", async () => {
    const res = await authRequest(
      app,
      `/api/objects/163?owner=${testUser.playerId}`,
      otherCookie,
      { method: "DELETE" },
    );
    expect(res.status).toBe(403);
  });

  test("POST ?owner= rejection", async () => {
    const res = await authRequest(
      app,
      `/api/objects?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify({ vnum: 168 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(res.status).toBe(400);
  });
});

// -- Empty state --

describe("empty state for builder with no objects", () => {
  let lowCookie: string;

  beforeAll(async () => {
    lowCookie = await getAuthCookie(app, "lowonlybuilder");
  });

  test("listing objects returns empty array when none exist", async () => {
    const res = await authRequest(app, "/api/objects", lowCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });

  test("listing objects returns empty array after create-then-delete", async () => {
    await authRequest(app, "/api/objects", lowCookie, {
      body: JSON.stringify({ vnum: 500 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/objects/500", lowCookie, { method: "DELETE" });

    const res = await authRequest(app, "/api/objects", lowCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });
});
