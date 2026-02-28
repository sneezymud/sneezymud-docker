import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import { authRequest, getAuthCookie } from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app);
});

afterAll(async () => {
  await immortalDb.execute(
    sql`DELETE FROM mob_extra WHERE vnum IN (120, 121, 170, 171, 172, 175)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mob_imm WHERE vnum IN (120, 121, 170, 171, 172, 175)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mobresponses WHERE vnum IN (120, 121, 170, 171, 172, 175)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mob WHERE vnum IN (120, 121, 170, 171, 172, 175)`,
  );
});

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
  description: "",
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
  long_desc: "",
  max_exist: 0,
  name: "",
  per: 0,
  race: 0,
  sex: 0,
  short_desc: "",
  skin: 0,
  spe: 0,
  spec_proc: 0,
  str: 0,
  tohit: 0,
  vision: 0,
  vnum: 120,
  weight: 0,
  wis: 0,
};

// -- Create --

describe("mob creation", () => {
  test("builder can create a mob within their blocks", async () => {
    const res = await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 120 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("vnum", 120);
  });

  test("creating a mob at an existing vnum returns 409", async () => {
    const res = await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 120 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(409);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Mob already exists");
  });

  test("creating a mob outside assigned blocks returns 403", async () => {
    const res = await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 500 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(403);
  });
});

// -- Read --

describe("mob listing and fetching", () => {
  test("builder can list their mobs", async () => {
    const res = await authRequest(app, "/api/mobs", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toBeInstanceOf(Array);
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 120 })]),
    );
  });

  test("builder can fetch a specific mob with extras and immunities", async () => {
    const res = await authRequest(app, "/api/mobs/120", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("vnum", 120);
    expect(body).toHaveProperty("extras");
    expect(body).toHaveProperty("immunities");
  });

  test("fetching a mob outside blocks returns 403", async () => {
    const res = await authRequest(app, "/api/mobs/500", cookie);

    expect(res.status).toBe(403);
  });

  test("fetching a nonexistent mob within blocks returns 404", async () => {
    const res = await authRequest(app, "/api/mobs/199", cookie);

    expect(res.status).toBe(404);
  });
});

// -- Update --

describe("mob updates", () => {
  test("builder can update a mob with extras and immunities roundtrip", async () => {
    const updated = {
      ...validMobUpdate,
      extras: [
        {
          description: "The guard wears polished armor.",
          keyword: "bamfin",
          vnum: 120,
        },
      ],
      immunities: [{ amt: 100, type: 1, vnum: 120 }],
      name: "guard",
      short_desc: "a burly guard",
    };

    const putRes = await authRequest(app, "/api/mobs/120", cookie, {
      body: JSON.stringify(updated),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(putRes.status).toBe(200);
    const result: unknown = await putRes.json();
    expect(result).toEqual(
      expect.objectContaining({
        name: "guard",
        short_desc: "a burly guard",
      }),
    );
    expect(result).toHaveProperty(
      "extras",
      expect.arrayContaining([expect.objectContaining({ keyword: "bamfin" })]),
    );
    expect(result).toHaveProperty(
      "immunities",
      expect.arrayContaining([expect.objectContaining({ amt: 100, type: 1 })]),
    );
  });

  test("invalid request body gets rejected", async () => {
    const res = await authRequest(app, "/api/mobs/120", cookie, {
      body: JSON.stringify({ name: "missing required fields" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(400);
  });
});

// -- Delete --

describe("mob deletion", () => {
  test("builder can delete a mob", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 170 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/mobs/170", cookie, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);

    const getRes = await authRequest(app, "/api/mobs/170", cookie);
    expect(getRes.status).toBe(404);
  });

  test("deleting a nonexistent mob returns 404", async () => {
    const res = await authRequest(app, "/api/mobs/198", cookie, {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });
});

// -- Bulk Delete --

describe("bulk mob deletion", () => {
  test("builder can bulk delete multiple mobs", async () => {
    // Create two mobs to delete
    for (const vnum of [171, 172]) {
      await authRequest(app, "/api/mobs", cookie, {
        body: JSON.stringify({ vnum }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    }

    const res = await authRequest(app, "/api/mobs/bulk", cookie, {
      body: JSON.stringify({ vnums: [171, 172] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 2, ok: true });

    // Verify they're gone
    const get171 = await authRequest(app, "/api/mobs/171", cookie);
    const get172 = await authRequest(app, "/api/mobs/172", cookie);
    expect(get171.status).toBe(404);
    expect(get172.status).toBe(404);
  });

  test("rejects vnums outside assigned blocks", async () => {
    // Create a mob within blocks to ensure it survives
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 171 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/mobs/bulk", cookie, {
      body: JSON.stringify({ vnums: [171, 500] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(403);

    // Verify the in-range mob was NOT deleted
    const getRes = await authRequest(app, "/api/mobs/171", cookie);
    expect(getRes.status).toBe(200);
  });

  test("empty array rejected by validation", async () => {
    const res = await authRequest(app, "/api/mobs/bulk", cookie, {
      body: JSON.stringify({ vnums: [] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(400);
  });

  test("non-existent vnums succeed silently", async () => {
    const res = await authRequest(app, "/api/mobs/bulk", cookie, {
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
  test("GET returns mob with values outside input constraints", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 175 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // Set ac to 200 directly in DB (outside input range 0-127)
    await immortalDb.execute(sql`UPDATE mob SET ac = 200 WHERE vnum = 175`);

    const res = await authRequest(app, "/api/mobs/175", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ ac: 200, vnum: 175 }));
  });

  test("PUT rejects values outside input constraints", async () => {
    const res = await authRequest(app, "/api/mobs/175", cookie, {
      body: JSON.stringify({ ...validMobUpdate, ac: 200, vnum: 175 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});
