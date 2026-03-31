import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { mobSchema } from "@/shared/schemas/mob.ts";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import { mob } from "../schema/immortal.ts";
import {
  authRequest,
  getAuthCookie,
  getLowOnlyAuthCookie,
} from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app);
});

afterAll(async () => {
  await immortalDb.execute(
    sql`DELETE FROM mob_extra WHERE vnum IN (120, 121, 170, 171, 172, 175, 176, 177, 178, 180, 181, 300)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mob_imm WHERE vnum IN (120, 121, 170, 171, 172, 175, 176, 177, 178, 180, 181, 300)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mobresponses WHERE vnum IN (120, 121, 170, 171, 172, 175, 176, 177, 178, 180, 181, 300)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM mob WHERE vnum IN (120, 121, 170, 171, 172, 175, 176, 177, 178, 180, 181, 300)`,
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

  test("update replaces child rows instead of appending", async () => {
    // Mob 120 already has 1 extra (keyword "bamfin") and 1 immunity from roundtrip test
    const putRes = await authRequest(app, "/api/mobs/120", cookie, {
      body: JSON.stringify({
        ...validMobUpdate,
        extras: [
          { description: "Replaced extra.", keyword: "deathcry", vnum: 120 },
        ],
        immunities: [],
        vnum: 120,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const res = await authRequest(app, "/api/mobs/120", cookie);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("extras", [
      expect.objectContaining({ keyword: "deathcry" }),
    ]);
    expect(body).toHaveProperty("immunities", []);
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
    expect(body).toEqual({ deleted: 0, ok: true });
  });
});

// -- Derived fields --

describe("mob derived fields", () => {
  test("pos is synced from def_position on update", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 176 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // Update with def_position = 5 (sitting)
    await authRequest(app, "/api/mobs/176", cookie, {
      body: JSON.stringify({ ...validMobUpdate, def_position: 5, vnum: 176 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Verify pos was synced in the DB
    const [row] = await immortalDb
      .select({ pos: mob.pos })
      .from(mob)
      .where(eq(mob.vnum, 176));
    expect(row).toEqual({ pos: 5 });
  });

  test("letter is 'A' when local_sound set but adjacent_sound empty", async () => {
    await authRequest(app, "/api/mobs/176", cookie, {
      body: JSON.stringify({
        ...validMobUpdate,
        adjacent_sound: "",
        local_sound: "The guard grunts.",
        vnum: 176,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const [row] = await immortalDb
      .select({ letter: mob.letter })
      .from(mob)
      .where(eq(mob.vnum, 176));
    expect(row).toEqual({ letter: "A" });
  });

  test("letter is 'L' when both sounds are set", async () => {
    await authRequest(app, "/api/mobs/176", cookie, {
      body: JSON.stringify({
        ...validMobUpdate,
        adjacent_sound: "You hear grunting nearby.",
        local_sound: "The guard grunts.",
        vnum: 176,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const [row] = await immortalDb
      .select({ letter: mob.letter })
      .from(mob)
      .where(eq(mob.vnum, 176));
    expect(row).toEqual({ letter: "L" });
  });

  test("letter is 'L' when both sounds are empty", async () => {
    await authRequest(app, "/api/mobs/176", cookie, {
      body: JSON.stringify({
        ...validMobUpdate,
        adjacent_sound: "",
        local_sound: "",
        vnum: 176,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const [row] = await immortalDb
      .select({ letter: mob.letter })
      .from(mob)
      .where(eq(mob.vnum, 176));
    expect(row).toEqual({ letter: "L" });
  });
});

// -- Concurrent create race --

describe("duplicate mob creation fallback", () => {
  test("second create for same vnum returns 409", async () => {
    // First create succeeds
    const res1 = await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 177 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res1.status).toBe(201);

    // Second create for same vnum returns 409
    const res2 = await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 177 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res2.status).toBe(409);
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

// -- Delete cascades --

describe("delete cascades to child tables", () => {
  test("re-created mob has no orphaned extras or immunities", async () => {
    // Create mob and populate child rows
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 178 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/mobs/178", cookie, {
      body: JSON.stringify({
        ...validMobUpdate,
        extras: [{ description: "old extra", keyword: "bamfin", vnum: 178 }],
        immunities: [{ amt: 50, type: 2, vnum: 178 }],
        vnum: 178,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Delete and re-create
    await authRequest(app, "/api/mobs/178", cookie, { method: "DELETE" });
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 178 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/mobs/178", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("extras", []);
    expect(body).toHaveProperty("immunities", []);
  });
});

// Valid mob payload that satisfies mobInputSchema (non-empty required strings)
const validMobInput = {
  ...validMobUpdate,
  description: "A mob.",
  long_desc: "A mob stands here.",
  name: "mob",
  short_desc: "a mob",
};

// -- Update with change --

describe("update preserves unchanged fields", () => {
  test("changing name preserves level", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 180 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // Set name="guard" and level=50
    await authRequest(app, "/api/mobs/180", cookie, {
      body: JSON.stringify({
        ...validMobInput,
        level: 50,
        name: "guard",
        vnum: 180,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Change name to "merchant", keep level=50
    const putRes = await authRequest(app, "/api/mobs/180", cookie, {
      body: JSON.stringify({
        ...validMobInput,
        level: 50,
        name: "merchant",
        vnum: 180,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const res = await authRequest(app, "/api/mobs/180", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ level: 50, name: "merchant", vnum: 180 }),
    );
  });
});

// -- Idempotency --

describe("save idempotency", () => {
  test("saving the same payload twice produces correct data", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 181 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = {
      ...validMobInput,
      extras: [
        { description: "A scarred face.", keyword: "bamfin", vnum: 181 },
      ],
      immunities: [{ amt: 75, type: 3, vnum: 181 }],
      name: "scarred warrior",
      vnum: 181,
    };

    // Save twice
    await authRequest(app, "/api/mobs/181", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const secondPut = await authRequest(app, "/api/mobs/181", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(secondPut.status).toBe(200);

    const res = await authRequest(app, "/api/mobs/181", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ name: "scarred warrior", vnum: 181 }),
    );
    expect(body).toHaveProperty("extras", [
      expect.objectContaining({
        description: "A scarred face.",
        keyword: "bamfin",
      }),
    ]);
    expect(body).toHaveProperty("immunities", [
      expect.objectContaining({ amt: 75, type: 3 }),
    ]);
  });
});

// -- Schema validation --

describe("response schema validation", () => {
  test("GET mob response conforms to mobSchema", async () => {
    const res = await authRequest(app, "/api/mobs/180", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = mobSchema.parse(body);
    expect(parsed.vnum).toBe(180);
  });
});

// -- Empty state --

describe("empty state for builder with no mobs", () => {
  let lowCookie: string;

  beforeAll(async () => {
    lowCookie = await getLowOnlyAuthCookie(app);
  });

  test("listing mobs returns empty array when none exist", async () => {
    const res = await authRequest(app, "/api/mobs", lowCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });

  test("listing mobs returns empty array after create-then-delete", async () => {
    await authRequest(app, "/api/mobs", lowCookie, {
      body: JSON.stringify({ vnum: 300 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/mobs/300", lowCookie, { method: "DELETE" });

    const res = await authRequest(app, "/api/mobs", lowCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });
});
