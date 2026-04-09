import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, sql } from "drizzle-orm";

import { roomSchema } from "@/shared/schemas/room.ts";

import { app } from "../app.ts";
import { immortalDb, sneezyDb } from "../db.ts";
import { room } from "../schema/immortal.ts";
import {
  authRequest,
  getAuthCookie,
  getExpandedAuthCookie,
  getLowOnlyAuthCookie,
  getOtherAuthCookie,
  testUser,
} from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app);
});

afterAll(async () => {
  const testVnums = sql`(100, 101, 102, 103, 104, 105, 106, 107, 110, 111, 140, 150, 151, 152, 155, 162, 180, 181)`;
  await immortalDb.execute(
    sql`DELETE FROM roomextra WHERE vnum IN ${testVnums}`,
  );
  await immortalDb.execute(
    sql`DELETE FROM roomexit WHERE vnum IN ${testVnums}`,
  );
  await immortalDb.execute(sql`DELETE FROM room WHERE vnum IN ${testVnums}`);
  await sneezyDb.execute(sql`DELETE FROM room WHERE vnum IN (140, 5000, 5001)`);
  // Restore testUser's wizdata in case TEST-OWNER-4b changed it
  await sneezyDb.execute(
    sql`UPDATE wizdata SET blockastart = 100, blockaend = 199 WHERE player_id = ${testUser.playerId}`,
  );
});

const validRoomUpdate = {
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

// -- Auth enforcement --

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

// -- Invalid vnum parameters --

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

// -- Create --

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

  test("creating a room outside assigned blocks returns 403", async () => {
    const res = await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 500 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(403);
  });
});

// -- Read --

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

// -- Update --

describe("room updates", () => {
  test("builder can update a room and exits survive the roundtrip", async () => {
    const updated = {
      capacity: 0,
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
      river_dir: 0,
      river_speed: 0,
      room_flag: 1 << 17,
      sector: 60,
      spec: 0,
      telelook: 0,
      teletarg: 0,
      teletime: 0,
      vnum: 100,
      x: 0,
      y: 0,
      z: 0,
      zone: 1,
    };

    const putRes = await authRequest(app, "/api/rooms/100", cookie, {
      body: JSON.stringify(updated),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(putRes.status).toBe(200);
    const result: unknown = await putRes.json();
    expect(result).toEqual(
      expect.objectContaining({
        description: "A test room with updated description",
        name: "Updated Test Room",
      }),
    );
    expect(result).toHaveProperty(
      "exits",
      expect.arrayContaining([
        expect.objectContaining({
          description: "A door leads north.",
          destination: 101,
        }),
      ]),
    );
    expect(result).toHaveProperty(
      "extras",
      expect.arrayContaining([
        expect.objectContaining({ name: "wall writing" }),
      ]),
    );
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
      body: JSON.stringify({
        capacity: 0,
        description: "",
        exits: [],
        extras: [],
        height: -1,
        name: "Stripped Room",
        river_dir: 0,
        river_speed: 0,
        room_flag: 0,
        sector: 0,
        spec: 0,
        telelook: 0,
        teletarg: 0,
        teletime: 0,
        vnum: 100,
        x: 0,
        y: 0,
        z: 0,
        zone: 1,
      }),
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

// -- Delete --

describe("room deletion", () => {
  test("builder can delete a room", async () => {
    // Create a room to delete
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 150 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const res = await authRequest(app, "/api/rooms/150", cookie, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);

    // Verify it's gone
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

// -- Search --

describe("room search", () => {
  // Self-contained: create a named room so search doesn't depend on update tests
  beforeAll(async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 101 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/101", cookie, {
      body: JSON.stringify({
        capacity: 0,
        description: "",
        exits: [],
        extras: [],
        height: -1,
        name: "Searchable Test Room",
        river_dir: 0,
        river_speed: 0,
        room_flag: 0,
        sector: 0,
        spec: 0,
        telelook: 0,
        teletarg: 0,
        teletime: 0,
        vnum: 101,
        x: 0,
        y: 0,
        z: 0,
        zone: 1,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Insert a sneezy room for cross-database search tests
    await sneezyDb.execute(sql`
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

  // Search crosses block boundaries intentionally - exit/key pickers need
  // to find rooms in other builders' blocks and the production database.
  test("SQL metacharacters in query are treated literally", async () => {
    // Create a room with % in the name
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 102 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/102", cookie, {
      body: JSON.stringify({
        capacity: 0,
        description: "",
        exits: [],
        extras: [],
        height: -1,
        name: "100% Haunted Room",
        river_dir: 0,
        river_speed: 0,
        room_flag: 0,
        sector: 0,
        spec: 0,
        telelook: 0,
        teletarg: 0,
        teletime: 0,
        vnum: 102,
        x: 0,
        y: 0,
        z: 0,
        zone: 1,
      }),
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

// -- Name lookup --

describe("room name lookup", () => {
  beforeAll(async () => {
    // Insert a sneezy room outside the builder's blocks for cross-block lookup
    await sneezyDb.execute(sql`
      INSERT IGNORE INTO room (vnum, name, x, y, z, description, zone, room_flag, sector, teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec)
      VALUES (5001, 'Cross Block Room', 0, 0, 0, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `);
  });

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
});

// -- Schema read/write split --

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
      body: JSON.stringify({
        capacity: 200,
        description: "",
        exits: [],
        extras: [],
        height: 0,
        name: "",
        river_dir: 0,
        river_speed: 0,
        room_flag: 0,
        sector: 0,
        spec: 0,
        telelook: 0,
        teletarg: 0,
        teletime: 0,
        vnum: 155,
        x: 0,
        y: 0,
        z: 0,
        zone: 1,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});

// -- Delete cascades --

describe("delete cascades to child tables", () => {
  test("re-created room has no orphaned exits or extras", async () => {
    // Create room and populate child rows
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 103 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/103", cookie, {
      body: JSON.stringify({
        capacity: 0,
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
        river_dir: 0,
        river_speed: 0,
        room_flag: 0,
        sector: 0,
        spec: 0,
        telelook: 0,
        teletarg: 0,
        teletime: 0,
        vnum: 103,
        x: 0,
        y: 0,
        z: 0,
        zone: 1,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Delete and re-create
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

// -- Update with change --

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

    // Save with description="old" and 2 exits
    await authRequest(app, "/api/rooms/104", cookie, {
      body: JSON.stringify({
        ...validRoomUpdate,
        description: "old",
        exits: twoExits,
        name: "Test Room",
        vnum: 104,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Save with description="new" and same exits
    const putRes = await authRequest(app, "/api/rooms/104", cookie, {
      body: JSON.stringify({
        ...validRoomUpdate,
        description: "new",
        exits: twoExits,
        name: "Test Room",
        vnum: 104,
      }),
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

// -- Idempotency --

describe("save idempotency", () => {
  test("saving the same payload twice produces correct data", async () => {
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 105 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = {
      ...validRoomUpdate,
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
    };

    // Save twice
    await authRequest(app, "/api/rooms/105", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const secondPut = await authRequest(app, "/api/rooms/105", cookie, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(secondPut.status).toBe(200);

    const res = await authRequest(app, "/api/rooms/105", cookie);
    const body: unknown = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ name: "Idempotent Room", vnum: 105 }),
    );
    expect(body).toHaveProperty("exits", [
      expect.objectContaining({ name: "north door" }),
    ]);
  });
});

// -- Schema validation --

describe("response schema validation", () => {
  test("GET room response conforms to roomSchema", async () => {
    const res = await authRequest(app, "/api/rooms/104", cookie);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    const parsed = roomSchema.parse(body);
    expect(parsed.vnum).toBe(104);
  });
});

// -- Coordinate derivation --

describe("room coordinate derivation from exit source", () => {
  test("new room derives coordinates from incoming exit", async () => {
    // Set room 104's coordinates to a known value
    await authRequest(app, "/api/rooms/104", cookie, {
      body: JSON.stringify({
        ...validRoomUpdate,
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
});

// -- Search pagination --

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

    // Clean up
    for (let i = 0; i < 25; i++) {
      await sneezyDb.execute(sql`DELETE FROM room WHERE vnum = ${6000 + i}`);
    }
  });
});

// -- Search deduplication --

describe("search deduplication across databases", () => {
  beforeAll(async () => {
    // Insert a room in sneezy (production) with a distinctive name
    await sneezyDb.execute(sql`
      INSERT INTO room (vnum, name, x, y, z, description, zone, room_flag, sector, teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec)
      VALUES (140, 'Sneezy Dedup Room', 0, 0, 0, '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `);

    // Create the same vnum in immortal with a different name
    await authRequest(app, "/api/rooms", cookie, {
      body: JSON.stringify({ vnum: 140 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    await authRequest(app, "/api/rooms/140", cookie, {
      body: JSON.stringify({
        ...validRoomUpdate,
        name: "Immortal Dedup Room",
        vnum: 140,
      }),
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

// -- Room creation defaults --

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

// -- Block B room creation --

describe("Block B room creation", () => {
  let lowOnlyCookie: string;

  beforeAll(async () => {
    lowOnlyCookie = await getLowOnlyAuthCookie(app);
  });

  afterAll(async () => {
    await immortalDb.execute(
      sql`DELETE FROM roomexit WHERE vnum IN (500, 700)`,
    );
    await immortalDb.execute(
      sql`DELETE FROM roomextra WHERE vnum IN (500, 700)`,
    );
    await immortalDb.execute(sql`DELETE FROM room WHERE vnum IN (500, 700)`);
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

// -- Owner scoping --

/** Create an entity in immortal via API and update it with full data. */
async function createAndUpdate(
  vnum: number,
  authCookie: string,
  updatePayload: Record<string, unknown>,
) {
  const createRes = await authRequest(app, "/api/rooms", authCookie, {
    body: JSON.stringify({ vnum }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(createRes.status).toBe(201);

  const putRes = await authRequest(app, `/api/rooms/${vnum}`, authCookie, {
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
    expandedCookie = await getExpandedAuthCookie(app);
    otherCookie = await getOtherAuthCookie(app);
  });

  test("TEST-OWNER-1: GET /api/rooms?owner=mine excludes other owners' entities", async () => {
    const vnumA = 110;
    const vnumB = 111;
    await createAndUpdate(vnumA, cookie, { ...validRoomUpdate });
    await createAndUpdate(vnumB, otherCookie, { ...validRoomUpdate });

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
    await createAndUpdate(vnum, cookie, {
      ...validRoomUpdate,
      name: "test user content",
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

  test("TEST-OWNER-5: cross-owner DELETE removes target's row", async () => {
    const vnum = 181;
    await createAndUpdate(vnum, cookie, { ...validRoomUpdate });
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
    await createAndUpdate(vnum, cookie, {
      ...validRoomUpdate,
      name: "original",
    });

    // Simulate a wizdata shift: move testUser's blockA out from under the vnum
    await sneezyDb.execute(
      sql`UPDATE wizdata SET blockastart = 1000, blockaend = 1099 WHERE player_id = ${testUser.playerId}`,
    );

    // Senior PUTs, changing only the name
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

    // Verify the stored block is still 1
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
        body: JSON.stringify({ ...validRoomUpdate, vnum: 100 }),
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
