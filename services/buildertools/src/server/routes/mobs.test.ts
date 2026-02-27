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
    sql`DELETE FROM mob_extra WHERE vnum IN (120, 121, 170)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mob_imm WHERE vnum IN (120, 121, 170)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mobresponses WHERE vnum IN (120, 121, 170)`,
  );
  await immortalDb.execute(sql`DELETE FROM mob WHERE vnum IN (120, 121, 170)`);
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
