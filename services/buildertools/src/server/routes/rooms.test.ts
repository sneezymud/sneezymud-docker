import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";

import { roomSchema } from "@/shared/schemas/room.ts";

import { app } from "../app.ts";
import { immortalDb, sneezyDb } from "../db.ts";
import { room } from "../schema/immortal.ts";
import {
  authRequest,
  createAndUpdate,
  expandedUser,
  getAuthCookie,
  otherUser,
  testUser,
  validRoomPayload,
} from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app, "testbuilder");
});

afterAll(async () => {
  const testVnums = sql`(100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 130, 133, 134, 140, 150, 151, 152, 155, 160, 162, 180, 181, 183, 184)`;
  await immortalDb.execute(
    sql`DELETE FROM roomextra WHERE vnum IN ${testVnums}`,
  );
  await immortalDb.execute(
    sql`DELETE FROM roomexit WHERE vnum IN ${testVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM room WHERE vnum IN ${testVnums}`);
  await sneezyDb.execute(sql`DELETE FROM room WHERE vnum IN (140, 5000, 5001)`);
  // Restore testUser's wizdata in case TEST-OWNER-4b changed it
  return sneezyDb.execute(
    sql`UPDATE wizdata SET blockastart = 100, blockaend = 199 WHERE player_id = ${testUser.playerId}`,
  );
});

describe("auth enforcement", () => {
  test("unauthenticated request returns 401", async () => {
    const res = await app.request("/api/rooms", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    expect(res.status).toBe(401);
  });

  test("request without X-Requested-With returns 403", async () => {
    const res = await app.request("/api/rooms", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});

describe("invalid vnum parameters", () => {
  test("non-numeric vnum returns 400", async () => {
    const res = await authRequest(app, "/api/rooms/abc", cookie);
    expect(res.status).toBe(400);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Invalid vnum");
  });

  test("negative vnum returns 400", async () => {
    const res = await authRequest(app, "/api/rooms/-1", cookie);
    expect(res.status).toBe(400);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Invalid vnum");
  });
});

describe("room creation", () => {
  test("builder can create a room within their blocks", async () => {
    const res = await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 100 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("vnum", 100);
    expect(body).toHaveProperty("zone", 1);
  });

  test("creating a room at an existing vnum returns 409", async () => {
    const res = await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 100 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(409);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Room already exists");
  });

  test("POST with ?owner= parameter returns 400", async () => {
    const res = await authRequest(
      app,
      `/api/rooms?owner=${testUser.playerId}`,
      cookie,
      {
        body: JSON.stringify({ vnum: 199 }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    expect(res.status).toBe(400);
  });

  test("creating a room outside assigned blocks returns 403", async () => {
    const res = await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 500 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(403);
  });
});

describe("room listing and fetching", () => {
  test("builder can list their rooms", async () => {
    const res = await authRequest(app, "/api/rooms", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toBeInstanceOf(Array);
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 100 })]),
    );
  });

  test("builder can fetch a specific room with exits and extras", async () => {
    const res = await authRequest(app, "/api/rooms/100", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("vnum", 100);
    expect(body).toHaveProperty("exits");
    expect(body).toHaveProperty("extras");
  });

  test("fetching a room outside blocks returns 403", async () => {
    const res = await authRequest(app, "/api/rooms/500", cookie);

    expect(res.status).toBe(403);
  });

  test("fetching a nonexistent room within blocks returns 404", async () => {
    const res = await authRequest(app, "/api/rooms/199", cookie);

    expect(res.status).toBe(404);
  });
});

describe("room updates", () => {
  test("builder can update a room and exits survive the roundtrip", async () => {
    const updated = validRoomPayload({
      description: "A test room with updated description",
      exits: [
        {
          block: 1,
          condition_flag: 0,
          description: "A door leads north.",
          destination: 101,
          direction: 0,
          key_num: -1,
          lock_difficulty: 0,
          name: "door",
          type: 1,
          vnum: 100,
          weight: 0,
        },
      ],
      extras: [
        {
          description: "You see faded writing on the wall.",
          name: "wall writing",
          vnum: 100,
        },
      ],
      height: -1,
      name: "Updated Test Room",
      room_flag: 1 << 17,
      sector: 60,
    });

    const putRes = await authRequest(app, "/api/rooms/100", cookie, {
      body: JSON.stringify(updated),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(putRes.status).toBe(200);
    const getRes = await authRequest(app, "/api/rooms/100", cookie);
    const body: unknown = await getRes.json();
    const parsed = roomSchema.parse(body);
    expect(parsed.name).toBe("Updated Test Room");
    expect(parsed.description).toBe("A test room with updated description");
    expect(parsed.sector).toBe(60);
    expect(parsed.room_flag).toBe(1 << 17);
    expect(parsed.exits).toHaveLength(1);
    expect(parsed.exits[0]?.description).toBe("A door leads north.");
    expect(parsed.exits[0]?.destination).toBe(101);
    expect(parsed.exits[0]?.direction).toBe(0);
    expect(parsed.exits[0]?.type).toBe(1);
    expect(parsed.extras).toHaveLength(1);
    expect(parsed.extras[0]?.description).toBe(
      "You see faded writing on the wall.",
    );
    expect(parsed.extras[0]?.name).toBe("wall writing");
  });

  test("updating a nonexistent room within blocks returns 404", async () => {
    const res = await authRequest(app, "/api/rooms/198", cookie, {
      body: JSON.stringify(validRoomPayload({ vnum: 198 })),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(404);
  });

  test("invalid request body gets rejected", async () => {
    const res = await authRequest(app, "/api/rooms/100", cookie, {
      body: JSON.stringify({ name: "missing required fields" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(400);
  });

  test("update replaces child rows instead of appending", async () => {
    // Room 100 already has 1 exit and 1 extra from roundtrip test
    const putRes = await authRequest(app, "/api/rooms/100", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "",
          height: -1,
          name: "Stripped Room",
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const res = await authRequest(app, "/api/rooms/100", cookie);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("exits", []);
    expect(body).toHaveProperty("extras", []);
  });
});

describe("room deletion", () => {
  test("builder can delete a room", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 150 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/rooms/150", cookie, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);

    const getRes = await authRequest(app, "/api/rooms/150", cookie);
    expect(getRes.status).toBe(404);
  });

  test("deleting a nonexistent room returns 404", async () => {
    const res = await authRequest(app, "/api/rooms/198", cookie, {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });
});

describe("room search", () => {
  // Self-contained: create a named room so search doesn't depend on update tests
  beforeAll(async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 101 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/101", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "",
          height: -1,
          name: "Searchable Test Room",
          vnum: 101,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Insert a sneezy room for cross-database search tests
    return sneezyDb.execute(sql`
      INSERT INTO room (vnum, name, x, y, z, description, zone, room_flag, sector, teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec)
      VALUES (5000, 'Sneezy Production Room', 0, 0, 0, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `);
  });

  test("short query returns empty array", async () => {
    const res = await authRequest(app, "/api/rooms/search?q=x", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });

  test("search finds rooms by name", async () => {
    const res = await authRequest(
      app,
      "/api/rooms/search?q=Searchable+Test",
      cookie,
    );

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 101 })]),
    );
  });

  test("search results exclude non-matching rooms", async () => {
    const res = await authRequest(
      app,
      "/api/rooms/search?q=Searchable+Test",
      cookie,
    );

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 100 })]),
    );
  });

  // Search crosses block boundaries intentionally - exit/key pickers need
  // to find rooms in other builders' blocks and the production database.
  test("SQL metacharacters in query are treated literally", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 102 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/102", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "",
          height: -1,
          name: "100% Haunted Room",
          vnum: 102,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Searching for literal "%" should only match rooms with % in the name,
    // not wildcard-match everything
    const res = await authRequest(
      app,
      "/api/rooms/search?q=100%25+Haunted",
      cookie,
    );

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 102 })]),
    );

    // Searching for "_" should not wildcard-match single characters
    const underscoreRes = await authRequest(
      app,
      "/api/rooms/search?q=10_+Haunted",
      cookie,
    );
    const underscoreBody: unknown = await underscoreRes.json();
    expect(underscoreBody).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 102 })]),
    );
  });

  test("search finds rooms in sneezy database too", async () => {
    const res = await authRequest(
      app,
      "/api/rooms/search?q=Sneezy+Production",
      cookie,
    );

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 5000 })]),
    );
  });

  test("search by numeric vnum", async () => {
    const res = await authRequest(app, "/api/rooms/search?q=101", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([expect.objectContaining({ vnum: 101 })]),
    );
  });
});

describe("room name lookup", () => {
  beforeAll(() =>
    // Insert a sneezy room outside the builder's blocks for cross-block lookup
    sneezyDb.execute(sql`
      INSERT IGNORE INTO room (vnum, name, x, y, z, description, zone, room_flag, sector, teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec)
      VALUES (5001, 'Cross Block Room', 0, 0, 0, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `),
  );

  // Name lookup intentionally bypasses block access checks - exits reference
  // rooms in other builders' blocks and need to display their names.
  test("returns name for room outside builder blocks", async () => {
    const res = await authRequest(app, "/api/rooms/name/5001", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ name: "Cross Block Room", vnum: 5001 }),
    );
  });

  test("returns null name for nonexistent room", async () => {
    const res = await authRequest(app, "/api/rooms/name/49999", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ name: null, vnum: 49_999 }));
  });

  test("does not leak another builder's immortal draft name", async () => {
    // Insert an immortal draft row at the same vnum owned by otherUser.
    // Caller's scoped query must not match it - fall through to sneezy.
    await immortalDb.execute(sql`
      INSERT IGNORE INTO room
        (vnum, name, x, y, z, description, zone, room_flag, sector, teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec, player_id, block)
      VALUES
        (5001, 'other builder draft', 0, 0, 0, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ${otherUser.playerId}, NULL)
    `);
    const res = await authRequest(app, "/api/rooms/name/5001", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ name: "Cross Block Room", vnum: 5001 }),
    );
    await immortalDb.execute(
      sql`DELETE FROM room WHERE vnum = 5001 AND player_id = ${otherUser.playerId}`,
    );
  });
});

describe("bulk room deletion", () => {
  test("builder can bulk delete multiple rooms", async () => {
    for (const vnum of [151, 152]) {
      await authRequest(app, "/api/rooms", cookie, {
        body: JSON.stringify({ vnum }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    }

    const res = await authRequest(app, "/api/rooms/bulk", cookie, {
      body: JSON.stringify({ vnums: [151, 152] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 2, ok: true });

    const get151 = await authRequest(app, "/api/rooms/151", cookie);
    const get152 = await authRequest(app, "/api/rooms/152", cookie);
    expect(get151.status).toBe(404);
    expect(get152.status).toBe(404);
  });

  test("rejects vnums outside assigned blocks", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 151 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/rooms/bulk", cookie, {
      body: JSON.stringify({ vnums: [151, 500] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(403);

    const getRes = await authRequest(app, "/api/rooms/151", cookie);
    expect(getRes.status).toBe(200);
  });

  test("empty array rejected by validation", async () => {
    const res = await authRequest(app, "/api/rooms/bulk", cookie, {
      body: JSON.stringify({ vnums: [] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(400);
  });

  test("non-existent vnums succeed silently", async () => {
    const res = await authRequest(app, "/api/rooms/bulk", cookie, {
      body: JSON.stringify({ vnums: [198, 199] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual({ deleted: 0, ok: true });
  });

  test("bulk delete with owner parameter returns 400", async () => {
    const res = await authRequest(app, "/api/rooms/bulk?owner=99999", cookie, {
      body: JSON.stringify({ vnums: [100] }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    expect(res.status).toBe(400);
  });
});

describe("out-of-range data readable from DB", () => {
  test("GET returns room with values outside input constraints", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 155 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // Set capacity to 200 directly in DB (outside input range 0-100)
    await immortalDb.execute(
      sql`UPDATE room SET capacity = 200 WHERE vnum = 155`,
    );

    const res = await authRequest(app, "/api/rooms/155", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ capacity: 200, vnum: 155 }));
  });

  test("PUT rejects values outside input constraints", async () => {
    const res = await authRequest(app, "/api/rooms/155", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          capacity: 200,
          description: "",
          name: "",
          vnum: 155,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});

describe("schema boundary round-trips", () => {
  test("room_flag round-trips at INT32_MIN and INT32_MAX", async () => {
    // The schema allows INT32_MIN..INT32_MAX for room_flag; the DB column
    // must accept and return the full range without truncation or sign-flip.
    const vnum = 118;
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    for (const room_flag of [-2_147_483_648, 2_147_483_647]) {
      const putRes = await authRequest(app, `/api/rooms/${vnum}`, cookie, {
        body: JSON.stringify(validRoomPayload({ room_flag, vnum })),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      expect(putRes.status).toBe(200);
      const getRes = await authRequest(app, `/api/rooms/${vnum}`, cookie);
      expect(getRes.status).toBe(200);
      const body: unknown = await getRes.json();
      expect(body).toEqual(expect.objectContaining({ room_flag, vnum }));
    }
  });
});

describe("delete cascades to child tables", () => {
  test("re-created room has no orphaned exits or extras", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 103 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/103", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "",
          exits: [
            {
              block: 0,
              condition_flag: 0,
              description: "old exit",
              destination: 100,
              direction: 0,
              key_num: -1,
              lock_difficulty: 0,
              name: "",
              type: 0,
              vnum: 103,
              weight: 0,
            },
          ],
          extras: [{ description: "old extra", name: "old", vnum: 103 }],
          height: -1,
          name: "Cascade Test Room",
          vnum: 103,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    await authRequest(app, "/api/rooms/103", cookie, { method: "DELETE" });
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 103 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/rooms/103", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("exits", []);
    expect(body).toHaveProperty("extras", []);
  });
});

describe("update preserves unchanged fields", () => {
  test("changing description preserves exits", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 104 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const twoExits = [
      {
        block: 0,
        condition_flag: 0,
        description: "A passage north.",
        destination: 100,
        direction: 0,
        key_num: -1,
        lock_difficulty: 0,
        name: "",
        type: 0,
        vnum: 104,
        weight: 0,
      },
      {
        block: 0,
        condition_flag: 0,
        description: "A passage south.",
        destination: 101,
        direction: 2,
        key_num: -1,
        lock_difficulty: 0,
        name: "",
        type: 0,
        vnum: 104,
        weight: 0,
      },
    ];

    await authRequest(app, "/api/rooms/104", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "old",
          exits: twoExits,
          name: "Test Room",
          vnum: 104,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const putRes = await authRequest(app, "/api/rooms/104", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "new",
          exits: twoExits,
          name: "Test Room",
          vnum: 104,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const res = await authRequest(app, "/api/rooms/104", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ description: "new", vnum: 104 }),
    );
    expect(body).toHaveProperty(
      "exits",
      expect.arrayContaining([
        expect.objectContaining({ destination: 100, direction: 0 }),
        expect.objectContaining({ destination: 101, direction: 2 }),
      ]),
    );
  });
});

describe("save idempotency", () => {
  test("saving the same payload twice produces identical data", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 105 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = validRoomPayload({
      exits: [
        {
          block: 0,
          condition_flag: 0,
          description: "",
          destination: 100,
          direction: 0,
          key_num: -1,
          lock_difficulty: 0,
          name: "north door",
          type: 1,
          vnum: 105,
          weight: 0,
        },
      ],
      name: "Idempotent Room",
      vnum: 105,
    });

    await authRequest(app, "/api/rooms/105", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const getA = await authRequest(app, "/api/rooms/105", cookie);
    expect(getA.status).toBe(200);
    const snapshotA: unknown = await getA.json();
    const parsedA = roomSchema.parse(snapshotA);

    await authRequest(app, "/api/rooms/105", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const getB = await authRequest(app, "/api/rooms/105", cookie);
    expect(getB.status).toBe(200);
    const snapshotB: unknown = await getB.json();
    const parsedB = roomSchema.parse(snapshotB);

    // Full deep equality - no duplicate child rows, no changed values
    expect(parsedB).toEqual(parsedA);
  });
});

describe("response schema validation", () => {
  test("GET room response conforms to roomSchema", async () => {
    const res = await authRequest(app, "/api/rooms/104", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = roomSchema.parse(body);
    expect(parsed.vnum).toBe(104);
  });

  test("populated room with exits and extras conforms to roomSchema", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    await authRequest(app, "/api/rooms/130", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "A populated room.",
          exits: [
            {
              block: 0,
              condition_flag: 0,
              description: "",
              destination: 100,
              direction: 0,
              key_num: -1,
              lock_difficulty: 0,
              name: "",
              type: 0,
              vnum: 130,
              weight: 0,
            },
          ],
          extras: [
            { description: "A scratched wall.", name: "wall", vnum: 130 },
          ],
          name: "Populated Test Room",
          sector: 3,
          vnum: 130,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    const res = await authRequest(app, "/api/rooms/130", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = roomSchema.parse(body);
    expect(parsed.exits).toHaveLength(1);
    expect(parsed.extras).toHaveLength(1);
    expect(parsed.sector).toBe(3);
  });
});

describe("full-field roundtrip", () => {
  test("every field survives a PUT/GET cycle", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 160 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const fullPayload = {
      capacity: 50,
      description: "A vast chamber with echoing walls.",
      exits: [
        {
          block: 1,
          condition_flag: 42,
          description: "A heavy iron door.",
          destination: 100,
          direction: 0,
          key_num: 500,
          lock_difficulty: 75,
          name: "iron door",
          type: 1,
          vnum: 160,
          weight: 30,
        },
        {
          block: 1,
          condition_flag: 0,
          description: "A narrow passage.",
          destination: 101,
          direction: 2,
          key_num: -1,
          lock_difficulty: 0,
          name: "",
          type: 0,
          vnum: 160,
          weight: 0,
        },
      ],
      extras: [
        {
          description: "Ancient runes carved into the stone.",
          name: "runes stone",
          vnum: 160,
        },
        {
          description: "A faded tapestry hangs on the wall.",
          name: "tapestry wall",
          vnum: 160,
        },
      ],
      height: 100,
      name: "Grand Chamber",
      river_dir: 3,
      river_speed: 50,
      room_flag: (1 << 3) | (1 << 17),
      sector: 5,
      spec: 33,
      telelook: 1,
      teletarg: 100,
      teletime: 500,
      vnum: 160,
      x: 42,
      y: -15,
      z: 7,
      zone: 1,
    };

    const putRes = await authRequest(app, "/api/rooms/160", cookie, {
      body: JSON.stringify(fullPayload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const getRes = await authRequest(app, "/api/rooms/160", cookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    const parsed = roomSchema.parse(body);

    expect(parsed.capacity).toBe(fullPayload.capacity);
    expect(parsed.description).toBe(fullPayload.description);
    expect(parsed.height).toBe(fullPayload.height);
    expect(parsed.name).toBe(fullPayload.name);
    expect(parsed.river_dir).toBe(fullPayload.river_dir);
    expect(parsed.river_speed).toBe(fullPayload.river_speed);
    expect(parsed.room_flag).toBe(fullPayload.room_flag);
    expect(parsed.sector).toBe(fullPayload.sector);
    expect(parsed.spec).toBe(fullPayload.spec);
    expect(parsed.telelook).toBe(fullPayload.telelook);
    expect(parsed.teletarg).toBe(fullPayload.teletarg);
    expect(parsed.teletime).toBe(fullPayload.teletime);
    expect(parsed.vnum).toBe(fullPayload.vnum);
    expect(parsed.x).toBe(fullPayload.x);
    expect(parsed.y).toBe(fullPayload.y);
    expect(parsed.z).toBe(fullPayload.z);
    expect(parsed.zone).toBe(fullPayload.zone);

    expect(parsed.exits).toHaveLength(2);
    const northExit = parsed.exits.find((e) => e.direction === 0);
    expect(northExit?.block).toBe(1);
    expect(northExit?.condition_flag).toBe(42);
    expect(northExit?.description).toBe("A heavy iron door.");
    expect(northExit?.destination).toBe(100);
    expect(northExit?.key_num).toBe(500);
    expect(northExit?.lock_difficulty).toBe(75);
    expect(northExit?.name).toBe("iron door");
    expect(northExit?.type).toBe(1);
    expect(northExit?.weight).toBe(30);

    const southExit = parsed.exits.find((e) => e.direction === 2);
    expect(southExit?.condition_flag).toBe(0);
    expect(southExit?.description).toBe("A narrow passage.");
    expect(southExit?.destination).toBe(101);
    expect(southExit?.key_num).toBe(-1);
    expect(southExit?.lock_difficulty).toBe(0);
    expect(southExit?.name).toBe("");
    expect(southExit?.type).toBe(0);
    expect(southExit?.weight).toBe(0);

    expect(parsed.extras).toHaveLength(2);
    const runeExtra = parsed.extras.find((e) => e.name === "runes stone");
    expect(runeExtra?.description).toBe("Ancient runes carved into the stone.");
    const tapestryExtra = parsed.extras.find((e) => e.name === "tapestry wall");
    expect(tapestryExtra?.description).toBe(
      "A faded tapestry hangs on the wall.",
    );
  });
});

describe("room coordinate derivation from exit source", () => {
  // Known coords for the source room in every direction test. Each sub-test
  // first updates the source to reference a single exit pointing at its own
  // target vnum (replace-not-append on the roomexit table), then creates the
  // target. The source's coords stay stable because the PUT payload sets the
  // same x/y/z each time.
  const SOURCE_VNUM = 108;
  const SOURCE_COORDS = { x: 10, y: 20, z: 5 };

  async function createWithIncomingExit({
    destination,
    direction,
  }: {
    destination: number;
    direction: number;
  }) {
    await authRequest(app, `/api/rooms/${SOURCE_VNUM}`, cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "source room",
          exits: [
            {
              block: 1,
              condition_flag: 0,
              description: "",
              destination,
              direction,
              key_num: -1,
              lock_difficulty: 0,
              name: "",
              type: 0,
              vnum: SOURCE_VNUM,
              weight: 0,
            },
          ],
          vnum: SOURCE_VNUM,
          ...SOURCE_COORDS,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: destination }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const res = await authRequest(app, `/api/rooms/${destination}`, cookie);
    const parsed = roomSchema.parse(await res.json());
    return { x: parsed.x, y: parsed.y, z: parsed.z };
  }

  beforeAll(() =>
    // Create the shared source room once. It gets re-PUT in each test to flip
    // its single exit to the relevant direction, but the row itself persists.
    authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: SOURCE_VNUM }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );

  test("new room derives coordinates from incoming exit", async () => {
    await authRequest(app, "/api/rooms/104", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          description: "source room",
          exits: [
            {
              block: 1,
              condition_flag: 0,
              description: "",
              destination: 106,
              direction: 0, // North
              key_num: -1,
              lock_difficulty: 0,
              name: "",
              type: 0,
              vnum: 104,
              weight: 0,
            },
          ],
          vnum: 104,
          x: 10,
          y: 20,
          z: 5,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Create room 106 - should derive coords from room 104's north exit
    // North = direction 0 = offset {x:0, y:1, z:0}
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 106 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/rooms/106", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        x: 10,
        y: 21, // 20 + 1 (north offset)
        z: 5,
      }),
    );
  });

  test("direction 4 (up) adds 1 to z", async () => {
    const coords = await createWithIncomingExit({
      destination: 109,
      direction: 4,
    });
    expect(coords).toEqual({
      x: SOURCE_COORDS.x,
      y: SOURCE_COORDS.y,
      z: SOURCE_COORDS.z + 1,
    });
  });

  test("direction 5 (down) subtracts 1 from z", async () => {
    const coords = await createWithIncomingExit({
      destination: 112,
      direction: 5,
    });
    expect(coords).toEqual({
      x: SOURCE_COORDS.x,
      y: SOURCE_COORDS.y,
      z: SOURCE_COORDS.z - 1,
    });
  });

  test("direction 6 (NE) adds 1 to x and y", async () => {
    const coords = await createWithIncomingExit({
      destination: 113,
      direction: 6,
    });
    expect(coords).toEqual({
      x: SOURCE_COORDS.x + 1,
      y: SOURCE_COORDS.y + 1,
      z: SOURCE_COORDS.z,
    });
  });

  test("direction 7 (NW) subtracts 1 from x, adds 1 to y", async () => {
    const coords = await createWithIncomingExit({
      destination: 114,
      direction: 7,
    });
    expect(coords).toEqual({
      x: SOURCE_COORDS.x - 1,
      y: SOURCE_COORDS.y + 1,
      z: SOURCE_COORDS.z,
    });
  });

  test("direction 8 (SE) adds 1 to x, subtracts 1 from y", async () => {
    const coords = await createWithIncomingExit({
      destination: 115,
      direction: 8,
    });
    expect(coords).toEqual({
      x: SOURCE_COORDS.x + 1,
      y: SOURCE_COORDS.y - 1,
      z: SOURCE_COORDS.z,
    });
  });

  test("direction 9 (SW) subtracts 1 from x and y", async () => {
    const coords = await createWithIncomingExit({
      destination: 116,
      direction: 9,
    });
    expect(coords).toEqual({
      x: SOURCE_COORDS.x - 1,
      y: SOURCE_COORDS.y - 1,
      z: SOURCE_COORDS.z,
    });
  });

  test("falls back to {0,0,0} when the incoming exit's direction has no offset", async () => {
    // Create source room 117 with known non-zero coords, then bypass Zod by
    // inserting a roomexit row with direction=10 (outside DIRECTION_OFFSETS)
    // directly via SQL. This exercises the defensive fallback branch in
    // deriveCoords. If the branch were removed, the derivation would either
    // crash or return (10 + undefined, 20 + undefined, 5 + undefined) = NaNs.
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 117 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/117", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          exits: [],
          vnum: 117,
          x: 10,
          y: 20,
          z: 5,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    await immortalDb.execute(sql`
      INSERT INTO roomexit
        (vnum, player_id, direction, destination, name, condition_flag, type, key_num, lock_difficulty, weight, description, block)
      VALUES
        (117, ${testUser.playerId}, 10, 134, '', 0, 0, -1, 0, 0, '', 1)
    `);

    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 134 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/rooms/134", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ x: 0, y: 0, z: 0 }));
  });

  test("creates a room at {0,0,0} when no incoming exit points to it", async () => {
    // Complement to the derivation tests: with no exit pointing at vnum 133,
    // deriveCoords's first lookup returns no row and the function returns the
    // defaults immediately. This pins the "no incoming exit" early-return.
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 133 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const res = await authRequest(app, "/api/rooms/133", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ x: 0, y: 0, z: 0 }));
  });
});

describe("room search pagination", () => {
  test("search returns at most 20 results", async () => {
    // Insert 25 rooms in the sneezy database with matching names
    // (sneezy rooms don't require block access for search)
    for (let i = 0; i < 25; i++) {
      const vnum = 6000 + i;
      await sneezyDb.execute(sql`
        INSERT IGNORE INTO room (vnum, name, x, y, z, description, zone, room_flag, sector, teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec)
        VALUES (${vnum}, ${"PaginationTestRoom " + String(i)}, 0, 0, 0, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
      `);
    }

    const res = await authRequest(
      app,
      "/api/rooms/search?q=PaginationTestRoom",
      cookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (!Array.isArray(body)) throw new Error("expected array");
    expect(body.length).toBeLessThanOrEqual(20);

    for (let i = 0; i < 25; i++) {
      await sneezyDb.execute(sql`DELETE FROM room WHERE vnum = ${6000 + i}`);
    }
  });
});

describe("search deduplication across databases", () => {
  beforeAll(async () => {
    await sneezyDb.execute(sql`
      INSERT INTO room (vnum, name, x, y, z, description, zone, room_flag, sector, teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec)
      VALUES (140, 'Sneezy Dedup Room', 0, 0, 0, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `);

    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 140 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return authRequest(app, "/api/rooms/140", cookie, {
      body: JSON.stringify(
        validRoomPayload({
          name: "Immortal Dedup Room",
          vnum: 140,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
  });

  test("immortal version wins over sneezy for same vnum", async () => {
    const res = await authRequest(
      app,
      "/api/rooms/search?q=Dedup+Room",
      cookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (!Array.isArray(body)) throw new Error("expected array");

    const matches = body.filter((r: { vnum: number }) => r.vnum === 140);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toHaveProperty("name", "Immortal Dedup Room");
  });
});

describe("room creation defaults", () => {
  test("newly created room has expected default values", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 107 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/rooms/107", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();

    const parsed = roomSchema.parse(body);
    expect(parsed.name).toBe("");
    expect(parsed.description).toBe("");
    expect(parsed.sector).toBe(60);
    expect(parsed.height).toBe(-1);
    expect(parsed.spec).toBe(0);
    // UNDER_CONSTRUCTION bit (1 << 17 = 131072)
    expect(parsed.room_flag & (1 << 17)).toBe(1 << 17);
  });
});

describe("Block B room creation", () => {
  let lowOnlyCookie: string;

  beforeAll(async () => {
    lowOnlyCookie = await getAuthCookie(app, "lowonlybuilder");
  });

  afterAll(async () => {
    await immortalDb.execute(
      sql`DELETE FROM roomexit WHERE vnum IN (500, 700)`,
    );
    await immortalDb.execute(
      sql`DELETE FROM roomextra WHERE vnum IN (500, 700)`,
    );
    return immortalDb.execute(sql`DELETE FROM room WHERE vnum IN (500, 700)`);
  });

  test("builder can create room in Block B range", async () => {
    const res = await authRequest(app, "/api/rooms", lowOnlyCookie, {
      body: JSON.stringify({ vnum: 500 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(201);

    const getRes = await authRequest(app, "/api/rooms/500", lowOnlyCookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toHaveProperty("vnum", 500);
  });

  test("senior builder can create room outside own blocks", async () => {
    // lowOnlyUser has isSenior=true (POWER_LOW), so vnum checks are bypassed entirely
    const res = await authRequest(app, "/api/rooms", lowOnlyCookie, {
      body: JSON.stringify({ vnum: 700 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(res.status).toBe(201);
  });
});

describe("owner scoping", () => {
  let expandedCookie: string;
  let otherCookie: string;

  beforeAll(async () => {
    expandedCookie = await getAuthCookie(app, "expandedbuilder");
    otherCookie = await getAuthCookie(app, "otherbuilder");
  });

  test("TEST-OWNER-1: GET /api/rooms?owner=mine excludes other owners' entities", async () => {
    const vnumA = 110;
    const vnumB = 111;
    await createAndUpdate({
      app,
      cookie,
      entityType: "rooms",
      updatePayload: validRoomPayload(),
      vnum: vnumA,
    });
    await createAndUpdate({
      app,
      cookie: otherCookie,
      entityType: "rooms",
      updatePayload: validRoomPayload(),
      vnum: vnumB,
    });

    const res = await authRequest(app, "/api/rooms?owner=mine", cookie);
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

  test("TEST-OWNER-3: cross-owner GET returns target's draft, not senior's", async () => {
    const vnum = 180;
    await createAndUpdate({
      app,
      cookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "test user content" }),
      vnum,
    });
    // expandedUser has no draft at this vnum
    const res = await authRequest(
      app,
      `/api/rooms/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("name", "test user content");
  });

  test("TEST-OWNER-4a: senior cross-owner PUT persists changes", async () => {
    // expandedUser (senior) edits testUser's room 180 - already created in TEST-OWNER-3
    const getRes = await authRequest(
      app,
      `/api/rooms/180?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(getRes.status).toBe(200);
    const original: unknown = await getRes.json();
    if (typeof original !== "object" || original === null) {
      throw new Error("expected room object");
    }

    const putRes = await authRequest(
      app,
      `/api/rooms/180?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify({
          ...original,
          name: "senior edited content",
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(putRes.status).toBe(200);

    const verifyRes = await authRequest(
      app,
      `/api/rooms/180?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(verifyRes.status).toBe(200);
    const verifyBody: unknown = await verifyRes.json();
    expect(verifyBody).toHaveProperty("name", "senior edited content");
  });

  test("TEST-OWNER-4c: senior cross-owner PUT preserves target's player_id", async () => {
    // Regression lock on the NOTE in updateRoom ("player_id is deliberately
    // NOT in the .set() clause"). Reads the column directly since the API
    // never exposes player_id in responses.
    const vnum = 184;
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(
      app,
      `/api/rooms/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify(
          validRoomPayload({ name: "senior renamed room", vnum }),
        ),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    const [row] = await immortalDb
      .select({ player_id: room.player_id })
      .from(room)
      .where(eq(room.vnum, vnum));
    expect(row?.player_id).toBe(testUser.playerId);
    expect(row?.player_id).not.toBe(expandedUser.playerId);
  });

  test("TEST-OWNER-5: cross-owner DELETE removes target's row", async () => {
    const vnum = 181;
    await createAndUpdate({
      app,
      cookie,
      entityType: "rooms",
      updatePayload: validRoomPayload(),
      vnum,
    });
    const res = await authRequest(
      app,
      `/api/rooms/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
      { method: "DELETE" },
    );
    expect(res.status).toBe(200);
    const getRes = await authRequest(app, `/api/rooms/${vnum}`, cookie);
    expect(getRes.status).toBe(404);
  });

  test("TEST-OWNER-4b: block preservation under blocks-mismatch", async () => {
    const vnum = 162;
    await createAndUpdate({
      app,
      cookie,
      entityType: "rooms",
      updatePayload: validRoomPayload({ name: "original" }),
      vnum,
    });

    // Simulate a wizdata shift: move testUser's blockA out from under the vnum
    await sneezyDb.execute(
      sql`UPDATE wizdata SET blockastart = 1000, blockaend = 1099 WHERE player_id = ${testUser.playerId}`,
    );

    const getRes = await authRequest(
      app,
      `/api/rooms/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
    );
    expect(getRes.status).toBe(200);
    const original: unknown = await getRes.json();
    if (typeof original !== "object" || original === null) {
      throw new Error("expected room object");
    }

    const putRes = await authRequest(
      app,
      `/api/rooms/${vnum}?owner=${testUser.playerId}`,
      expandedCookie,
      {
        body: JSON.stringify({
          ...original,
          name: "edited despite blocks shift",
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(putRes.status).toBe(200);

    const [row] = await immortalDb
      .select({ block: room.block, name: room.name })
      .from(room)
      .where(and(eq(room.vnum, vnum), eq(room.player_id, testUser.playerId)));
    expect(row?.name).toBe("edited despite blocks shift");
    expect(row?.block).toBe(1);

    // Restore testUser's wizdata for subsequent tests
    await sneezyDb.execute(
      sql`UPDATE wizdata SET blockastart = 100, blockaend = 199 WHERE player_id = ${testUser.playerId}`,
    );
  });

  test("TEST-OWNER-6: non-senior ?owner= rejection on GET", async () => {
    const res = await authRequest(
      app,
      `/api/rooms/100?owner=${testUser.playerId}`,
      otherCookie,
    );
    expect(res.status).toBe(403);
  });

  test("TEST-OWNER-6: non-senior ?owner= rejection on PUT", async () => {
    const res = await authRequest(
      app,
      `/api/rooms/100?owner=${testUser.playerId}`,
      otherCookie,
      {
        body: JSON.stringify(validRoomPayload({ vnum: 100 })),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );
    expect(res.status).toBe(403);
  });

  test("TEST-OWNER-6: non-senior ?owner= rejection on DELETE", async () => {
    const res = await authRequest(
      app,
      `/api/rooms/100?owner=${testUser.playerId}`,
      otherCookie,
      { method: "DELETE" },
    );
    expect(res.status).toBe(403);
  });
});

describe("exit field roundtrip", () => {
  test("all exit fields survive save and reload", async () => {
    const vnum = 183;

    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const putRes = await authRequest(app, `/api/rooms/${vnum}`, cookie, {
      body: JSON.stringify(
        validRoomPayload({
          exits: [
            {
              // block on exits is ignored by the server - exits inherit the parent room's block
              block: 1,
              condition_flag: 42,
              description: "A heavy iron door.",
              destination: 181,
              direction: 0,
              key_num: 500,
              lock_difficulty: 75,
              name: "iron door",
              type: 1,
              vnum,
              weight: 30,
            },
          ],
          vnum,
        }),
      ),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    const getRes = await authRequest(app, `/api/rooms/${vnum}`, cookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    const parsed = roomSchema.parse(body);

    expect(parsed.exits).toHaveLength(1);
    const exit = parsed.exits[0];
    // block is inherited from the parent room, not independently stored per-exit
    expect(exit?.block).toBe(1);
    expect(exit?.condition_flag).toBe(42);
    expect(exit?.description).toBe("A heavy iron door.");
    expect(exit?.destination).toBe(181);
    expect(exit?.direction).toBe(0);
    expect(exit?.key_num).toBe(500);
    expect(exit?.lock_difficulty).toBe(75);
    expect(exit?.name).toBe("iron door");
    expect(exit?.type).toBe(1);
    expect(exit?.weight).toBe(30);
  });
});

describe("empty state for builder with no rooms", () => {
  let lowCookie: string;

  beforeAll(async () => {
    lowCookie = await getAuthCookie(app, "lowonlybuilder");
  });

  test("listing rooms returns empty array when none exist", async () => {
    const res = await authRequest(app, "/api/rooms", lowCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });

  test("listing rooms returns empty array after create-then-delete", async () => {
    await authRequest(app, "/api/rooms", lowCookie, {
      body: JSON.stringify({ vnum: 500 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/500", lowCookie, { method: "DELETE" });

    const res = await authRequest(app, "/api/rooms", lowCookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual([]);
  });
});
