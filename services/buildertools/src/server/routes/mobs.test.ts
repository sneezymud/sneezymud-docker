import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { mobSchema } from "@/shared/schemas/mob.ts";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import { mob } from "../schema/immortal.ts";
import {
  authRequest,
  cleanupTestVnums,
  expandedUser,
  getAuthCookie,
  testUser,
  validMobPayload,
} from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app, "testbuilder");
});

afterAll(() =>
  cleanupTestVnums({
    db: immortalDb,
    vnums: [
      120, 121, 143, 170, 171, 172, 175, 176, 177, 178, 180, 181, 182, 183, 184,
      185, 190, 191, 192, 193, 300,
    ],
  }),
);

describe("auth enforcement", () => {
  test("unauthenticated request returns 401", async () => {
    const res = await app.request("/api/mobs", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    expect(res.status).toBe(401);
  });

  test("request without X-Requested-With returns 403", async () => {
    const res = await app.request("/api/mobs", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});

describe("invalid vnum parameters", () => {
  test("GET /api/mobs/abc returns 400", async () => {
    const res = await authRequest(app, "/api/mobs/abc", cookie);
    expect(res.status).toBe(400);
  });

  test("GET /api/mobs/-1 returns 400", async () => {
    const res = await authRequest(app, "/api/mobs/-1", cookie);
    expect(res.status).toBe(400);
  });

  test("PUT /api/mobs/abc returns 400", async () => {
    const res = await authRequest(app, "/api/mobs/abc", cookie, {
      body: JSON.stringify(validMobPayload({ vnum: 120 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});

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

describe("mob updates", () => {
  test("builder can update a mob with extras and immunities roundtrip", async () => {
    const updated = validMobPayload({
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
      vnum: 120,
    });

    const putRes = await authRequest(app, "/api/mobs/120", cookie, {
      body: JSON.stringify(updated),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(putRes.status).toBe(200);
    const getRes = await authRequest(app, "/api/mobs/120", cookie);
    const body: unknown = await getRes.json();
    const parsed = mobSchema.parse(body);
    expect(parsed.name).toBe("guard");
    expect(parsed.short_desc).toBe("a burly guard");
    expect(parsed.extras).toHaveLength(1);
    expect(parsed.extras[0]?.keyword).toBe("bamfin");
    expect(parsed.immunities).toHaveLength(1);
    expect(parsed.immunities[0]?.amt).toBe(100);
    expect(parsed.immunities[0]?.type).toBe(1);
  });

  test("updating a nonexistent mob within blocks returns 404", async () => {
    const res = await authRequest(app, "/api/mobs/198", cookie, {
      body: JSON.stringify(validMobPayload({ vnum: 198 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(404);
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
      body: JSON.stringify(
        validMobPayload({
          extras: [
            { description: "Replaced extra.", keyword: "deathcry", vnum: 120 },
          ],
          immunities: [],
          vnum: 120,
        }),
      ),
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

describe("bulk mob deletion", () => {
  test("builder can bulk delete multiple mobs", async () => {
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

    const get171 = await authRequest(app, "/api/mobs/171", cookie);
    const get172 = await authRequest(app, "/api/mobs/172", cookie);
    expect(get171.status).toBe(404);
    expect(get172.status).toBe(404);
  });

  test("rejects vnums outside assigned blocks", async () => {
    // Mob 171 must remain after the bulk-DELETE rejection — the assertion
    // below relies on the in-range vnum surviving when the request is
    // refused due to an out-of-range sibling.
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

  test("bulk delete with owner parameter returns 400", async () => {
    const res = await authRequest(app, "/api/mobs/bulk?owner=99999", cookie, {
      body: JSON.stringify({ vnums: [120] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    expect(res.status).toBe(400);
  });
});

describe("mob derived fields", () => {
  test("pos is synced from def_position on update", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 176 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // def_position = 5 maps to "sitting"; pos column should mirror that.
    await authRequest(app, "/api/mobs/176", cookie, {
      body: JSON.stringify(validMobPayload({ def_position: 5, vnum: 176 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const [row] = await immortalDb
      .select({ pos: mob.pos })
      .from(mob)
      .where(eq(mob.vnum, 176));
    expect(row).toEqual({ pos: 5 });
  });

  test("letter is 'A' when local_sound set but adjacent_sound empty", async () => {
    await authRequest(app, "/api/mobs/176", cookie, {
      body: JSON.stringify(
        validMobPayload({
          adjacent_sound: "",
          local_sound: "The guard grunts.",
          vnum: 176,
        }),
      ),
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
      body: JSON.stringify(
        validMobPayload({
          adjacent_sound: "You hear grunting nearby.",
          local_sound: "The guard grunts.",
          vnum: 176,
        }),
      ),
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
      body: JSON.stringify(
        validMobPayload({
          adjacent_sound: "",
          local_sound: "",
          vnum: 176,
        }),
      ),
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

describe("out-of-range data readable from DB", () => {
  test("GET returns mob with values outside input constraints", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 175 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // ac = 200 falls outside the input schema's 0-127 range, so it can only
    // get into the DB via a direct UPDATE — exercise the read-path tolerance.
    await immortalDb.execute(sql`UPDATE mob SET ac = 200 WHERE vnum = 175`);

    const res = await authRequest(app, "/api/mobs/175", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ ac: 200, vnum: 175 }));
  });

  test("PUT rejects values outside input constraints", async () => {
    const res = await authRequest(app, "/api/mobs/175", cookie, {
      body: JSON.stringify(validMobPayload({ ac: 200, vnum: 175 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});

describe("schema boundary round-trips", () => {
  test("actions round-trips at 0 and UINT32_MAX", async () => {
    const vnum = 121;
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    for (const actions of [0, 4_294_967_295]) {
      const putRes = await authRequest(app, `/api/mobs/${vnum}`, cookie, {
        body: JSON.stringify(validMobPayload({ actions, vnum })),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      expect(putRes.status).toBe(200);
      const getRes = await authRequest(app, `/api/mobs/${vnum}`, cookie);
      expect(getRes.status).toBe(200);
      const body: unknown = await getRes.json();
      expect(body).toEqual(expect.objectContaining({ actions, vnum }));
    }
  });

  test("level round-trips at 1 and 100", async () => {
    const vnum = 121;
    for (const level of [1, 100]) {
      const putRes = await authRequest(app, `/api/mobs/${vnum}`, cookie, {
        body: JSON.stringify(validMobPayload({ level, vnum })),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      expect(putRes.status).toBe(200);
      const getRes = await authRequest(app, `/api/mobs/${vnum}`, cookie);
      expect(getRes.status).toBe(200);
      const body: unknown = await getRes.json();
      expect(body).toEqual(expect.objectContaining({ level, vnum }));
    }
  });
});

describe("delete cascades to child tables", () => {
  test("re-created mob has no orphaned extras or immunities", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 178 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/mobs/178", cookie, {
      body: JSON.stringify(
        validMobPayload({
          extras: [{ description: "old extra", keyword: "bamfin", vnum: 178 }],
          immunities: [{ amt: 50, type: 2, vnum: 178 }],
          vnum: 178,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

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

  test("deleting a mob also removes its mob responses", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 143 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const putRes = await authRequest(app, "/api/mob-responses/143", cookie, {
      body: JSON.stringify({ response: 'say {"hello";}', vnum: 143 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const getBeforeDelete = await authRequest(
      app,
      "/api/mob-responses/143",
      cookie,
    );
    expect(getBeforeDelete.status).toBe(200);
    const beforeBody: unknown = await getBeforeDelete.json();
    expect(beforeBody).toHaveProperty("response", 'say {"hello";}');

    const delRes = await authRequest(app, "/api/mobs/143", cookie, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);

    // Mob response endpoint returns 404 once the mob is gone — the
    // mobExists check rejects the request before the response lookup.
    const getAfterDelete = await authRequest(
      app,
      "/api/mob-responses/143",
      cookie,
    );
    expect(getAfterDelete.status).toBe(404);
    const afterBody: unknown = await getAfterDelete.json();
    expect(afterBody).toHaveProperty("error", "Mob not found");
  });
});

describe("update preserves unchanged fields", () => {
  test("changing name preserves level", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 180 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await authRequest(app, "/api/mobs/180", cookie, {
      body: JSON.stringify(
        validMobPayload({ level: 50, name: "guard", vnum: 180 }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const putRes = await authRequest(app, "/api/mobs/180", cookie, {
      body: JSON.stringify(
        validMobPayload({ level: 50, name: "merchant", vnum: 180 }),
      ),
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

describe("save idempotency", () => {
  test("saving the same payload twice produces identical data", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 181 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = validMobPayload({
      extras: [
        { description: "A scarred face.", keyword: "bamfin", vnum: 181 },
      ],
      immunities: [{ amt: 75, type: 3, vnum: 181 }],
      name: "scarred warrior",
      vnum: 181,
    });

    await authRequest(app, "/api/mobs/181", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const getA = await authRequest(app, "/api/mobs/181", cookie);
    expect(getA.status).toBe(200);
    const snapshotA: unknown = await getA.json();
    const parsedA = mobSchema.parse(snapshotA);

    await authRequest(app, "/api/mobs/181", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const getB = await authRequest(app, "/api/mobs/181", cookie);
    expect(getB.status).toBe(200);
    const snapshotB: unknown = await getB.json();
    const parsedB = mobSchema.parse(snapshotB);

    // Full deep equality catches re-save bugs that point assertions miss:
    // duplicated child rows from append-not-replace, drifted scalar fields
    // from accidental reformatting, etc.
    expect(parsedB).toEqual(parsedA);
  });
});

describe("response schema validation", () => {
  test("GET mob response conforms to mobSchema", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 182 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/mobs/182", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = mobSchema.parse(body);
    expect(parsed.vnum).toBe(182);
  });

  test("populated mob with child rows and non-default stats conforms to mobSchema", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 183 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await authRequest(app, "/api/mobs/183", cookie, {
      body: JSON.stringify(
        validMobPayload({
          ac: 50,
          extras: [
            { description: "A glowing aura.", keyword: "bamfin", vnum: 183 },
          ],
          immunities: [{ amt: 80, type: 2, vnum: 183 }],
          level: 30,
          name: "populated mob",
          race: 5,
          str: 20,
          vnum: 183,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const res = await authRequest(app, "/api/mobs/183", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = mobSchema.parse(body);
    expect(parsed.extras).toHaveLength(1);
    expect(parsed.immunities).toHaveLength(1);
    expect(parsed.level).toBe(30);
    expect(parsed.str).toBe(20);
  });
});

describe("full-field roundtrip", () => {
  test("every field survives a PUT/GET cycle", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 184 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const fullPayload = {
      ac: 50,
      actions: 7,
      adjacent_sound: "You hear clanking.",
      affects: 3,
      agi: 5,
      attacks: 3,
      bra: -10,
      can_be_seen: 100,
      cha: 15,
      class: 4,
      con: -5,
      damage_level: 80,
      damage_precision: 50,
      def_position: 7,
      description: "A fearsome warrior.",
      dex: 20,
      extras: [{ description: "Scarred face.", keyword: "bamfin", vnum: 184 }],
      fact_perc: 75,
      faction: 2,
      foc: 10,
      gold: 5,
      height: 200,
      hpbonus: 50,
      immunities: [{ amt: 50, type: 3, vnum: 184 }],
      intel: -15,
      kar: 8,
      level: 50,
      local_sound: "Battle cries.",
      long_desc: "A warrior stands here.",
      max_exist: 5,
      name: "warrior veteran",
      per: 12,
      race: 10,
      sex: 1,
      short_desc: "a warrior veteran",
      skin: 50,
      spe: -3,
      spec_proc: 0,
      str: 25,
      tohit: 30,
      vision: 50,
      vnum: 184,
      weight: 2000,
      wis: -20,
    };

    const putRes = await authRequest(app, "/api/mobs/184", cookie, {
      body: JSON.stringify(fullPayload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const getRes = await authRequest(app, "/api/mobs/184", cookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    const parsed = mobSchema.parse(body);

    expect(parsed.ac).toBe(fullPayload.ac);
    expect(parsed.actions).toBe(fullPayload.actions);
    expect(parsed.adjacent_sound).toBe(fullPayload.adjacent_sound);
    expect(parsed.affects).toBe(fullPayload.affects);
    expect(parsed.agi).toBe(fullPayload.agi);
    expect(parsed.attacks).toBe(fullPayload.attacks);
    expect(parsed.bra).toBe(fullPayload.bra);
    expect(parsed.can_be_seen).toBe(fullPayload.can_be_seen);
    expect(parsed.cha).toBe(fullPayload.cha);
    expect(parsed.class).toBe(fullPayload.class);
    expect(parsed.con).toBe(fullPayload.con);
    expect(parsed.damage_level).toBe(fullPayload.damage_level);
    expect(parsed.damage_precision).toBe(fullPayload.damage_precision);
    expect(parsed.def_position).toBe(fullPayload.def_position);
    expect(parsed.description).toBe(fullPayload.description);
    expect(parsed.dex).toBe(fullPayload.dex);
    expect(parsed.fact_perc).toBe(fullPayload.fact_perc);
    expect(parsed.faction).toBe(fullPayload.faction);
    expect(parsed.foc).toBe(fullPayload.foc);
    expect(parsed.gold).toBe(fullPayload.gold);
    expect(parsed.height).toBe(fullPayload.height);
    expect(parsed.hpbonus).toBe(fullPayload.hpbonus);
    expect(parsed.intel).toBe(fullPayload.intel);
    expect(parsed.kar).toBe(fullPayload.kar);
    expect(parsed.level).toBe(fullPayload.level);
    expect(parsed.local_sound).toBe(fullPayload.local_sound);
    expect(parsed.long_desc).toBe(fullPayload.long_desc);
    expect(parsed.max_exist).toBe(fullPayload.max_exist);
    expect(parsed.name).toBe(fullPayload.name);
    expect(parsed.per).toBe(fullPayload.per);
    expect(parsed.race).toBe(fullPayload.race);
    expect(parsed.sex).toBe(fullPayload.sex);
    expect(parsed.short_desc).toBe(fullPayload.short_desc);
    expect(parsed.skin).toBe(fullPayload.skin);
    expect(parsed.spe).toBe(fullPayload.spe);
    expect(parsed.spec_proc).toBe(fullPayload.spec_proc);
    expect(parsed.str).toBe(fullPayload.str);
    expect(parsed.tohit).toBe(fullPayload.tohit);
    expect(parsed.vision).toBe(fullPayload.vision);
    expect(parsed.vnum).toBe(fullPayload.vnum);
    expect(parsed.weight).toBe(fullPayload.weight);
    expect(parsed.wis).toBe(fullPayload.wis);

    expect(parsed.extras).toHaveLength(1);
    expect(parsed.extras[0]?.description).toBe("Scarred face.");
    expect(parsed.extras[0]?.keyword).toBe("bamfin");
    expect(parsed.extras[0]?.vnum).toBe(184);

    expect(parsed.immunities).toHaveLength(1);
    expect(parsed.immunities[0]?.amt).toBe(50);
    expect(parsed.immunities[0]?.type).toBe(3);
    expect(parsed.immunities[0]?.vnum).toBe(184);
  });
});

describe("mob creation defaults", () => {
  test("newly created mob has expected default values", async () => {
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: 185 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/mobs/185", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = mobSchema.parse(body);

    expect(parsed.name).toBe("");
    expect(parsed.short_desc).toBe("");
    expect(parsed.level).toBe(1);
    expect(parsed.extras).toEqual([]);
    expect(parsed.immunities).toEqual([]);
  });
});

describe("empty state for builder with no mobs", () => {
  let lowCookie: string;

  beforeAll(async () => {
    lowCookie = await getAuthCookie(app, "lowonlybuilder");
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

describe("owner scoping", () => {
  let expandedCookie: string;
  let otherCookie: string;

  beforeAll(async () => {
    expandedCookie = await getAuthCookie(app, "expandedbuilder");
    otherCookie = await getAuthCookie(app, "otherbuilder");
  });

  test("?owner=mine list filtering excludes other owners' mobs", async () => {
    const vnumA = 190;
    const vnumB = 191;

    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum: vnumA }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, `/api/mobs/${vnumA}`, cookie, {
      body: JSON.stringify(validMobPayload({ vnum: vnumA })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    await authRequest(app, "/api/mobs", otherCookie, {
      body: JSON.stringify({ vnum: vnumB }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, `/api/mobs/${vnumB}`, otherCookie, {
      body: JSON.stringify(validMobPayload({ vnum: vnumB })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const res = await authRequest(app, "/api/mobs?owner=mine", cookie);
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
    const vnum = 192;
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, `/api/mobs/${vnum}`, cookie, {
      body: JSON.stringify(validMobPayload({ name: "test user mob", vnum })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const res = await authRequest(
      app,
      `/api/mobs/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("name", "test user mob");
  });

  test("senior cross-owner PUT persists changes", async () => {
    // Mob 192 created by the previous "senior cross-owner GET" test —
    // tests in this describe block share the entity and run in order.
    const putRes = await authRequest(
      app,
      `/api/mobs/192?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify(
          validMobPayload({ name: "senior edited mob", vnum: 192 }),
        ),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(putRes.status).toBe(200);

    const verifyRes = await authRequest(
      app,
      `/api/mobs/192?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(verifyRes.status).toBe(200);
    const body: unknown = await verifyRes.json();
    expect(body).toHaveProperty("name", "senior edited mob");
  });

  test("senior cross-owner PUT preserves target's player_id", async () => {
    // Regression lock on the NOTE in updateMob ("player_id is deliberately
    // NOT in the .set() clause"). If a senior edit rewrote player_id to the
    // caller's id, the target builder would silently lose ownership of their
    // draft. This test asserts the column directly since the API never
    // exposes player_id in responses.
    const vnum = 170;
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(
      app,
      `/api/mobs/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify(validMobPayload({ name: "senior renamed", vnum })),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    const [row] = await immortalDb
      .select({ player_id: mob.player_id })
      .from(mob)
      .where(eq(mob.vnum, vnum));
    expect(row?.player_id).toBe(testUser.playerId);
    expect(row?.player_id).not.toBe(expandedUser.playerId);
  });

  test("senior cross-owner DELETE removes target's mob", async () => {
    const vnum = 193;
    await authRequest(app, "/api/mobs", cookie, {
      body: JSON.stringify({ vnum }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(
      app,
      `/api/mobs/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
      { method: "DELETE" },
    );
    expect(res.status).toBe(200);

    const getRes = await authRequest(app, `/api/mobs/${vnum}`, cookie);
    expect(getRes.status).toBe(404);
  });

  test("non-senior ?owner= rejection on GET", async () => {
    const res = await authRequest(
      app,
      `/api/mobs/190?owner=${testUser.playerId}`,
      otherCookie,
    );
    expect(res.status).toBe(403);
  });

  test("non-senior ?owner= rejection on PUT", async () => {
    const res = await authRequest(
      app,
      `/api/mobs/190?owner=${testUser.playerId}`,
      otherCookie,
      {
        body: JSON.stringify(validMobPayload({ vnum: 190 })),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(res.status).toBe(403);
  });

  test("non-senior ?owner= rejection on DELETE", async () => {
    const res = await authRequest(
      app,
      `/api/mobs/190?owner=${testUser.playerId}`,
      otherCookie,
      { method: "DELETE" },
    );
    expect(res.status).toBe(403);
  });

  test("POST with ?owner= returns 400", async () => {
    const res = await authRequest(
      app,
      `/api/mobs?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify({ vnum: 199 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(res.status).toBe(400);
  });
});
