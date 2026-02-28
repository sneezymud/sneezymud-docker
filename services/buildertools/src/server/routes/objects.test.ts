import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb, sneezyDb } from "../db.ts";
import { authRequest, getAuthCookie } from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app);
});

afterAll(async () => {
  await immortalDb.execute(
    sql`DELETE FROM objaffect WHERE vnum IN (110, 111, 160, 161, 162, 165)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM objextra WHERE vnum IN (110, 111, 160, 161, 162, 165)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM obj WHERE vnum IN (110, 111, 160, 161, 162, 165)`,
  );
  await sneezyDb.execute(sql`DELETE FROM obj WHERE vnum IN (5100, 5101)`);
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
    const result: unknown = await putRes.json();
    expect(result).toEqual(
      expect.objectContaining({
        name: "sword blade",
        short_desc: "a sharp sword",
      }),
    );
    expect(result).toHaveProperty(
      "affects",
      expect.arrayContaining([expect.objectContaining({ mod1: 1, type: 18 })]),
    );
    expect(result).toHaveProperty(
      "extras",
      expect.arrayContaining([
        expect.objectContaining({ name: "blade sword" }),
      ]),
    );
  });

  test("invalid request body gets rejected", async () => {
    const res = await authRequest(app, "/api/objects/110", cookie, {
      body: JSON.stringify({ name: "missing required fields" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(400);
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
  });

  // Search crosses block boundaries intentionally - key pickers need
  // to find objects across all builders' blocks and the production database.
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
    expect(body).toEqual({ deleted: 2, ok: true });
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
