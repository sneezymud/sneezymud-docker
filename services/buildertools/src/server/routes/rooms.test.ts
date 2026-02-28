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
    sql`DELETE FROM roomextra WHERE vnum IN (100, 101, 150, 151, 152)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM roomexit WHERE vnum IN (100, 101, 150, 151, 152)`,
  );
  await immortalDb.execute(
    sql`DELETE FROM room WHERE vnum IN (100, 101, 150, 151, 152)`,
  );
  await sneezyDb.execute(sql`DELETE FROM room WHERE vnum IN (5000, 5001)`);
});

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
    expect(body).toEqual({ deleted: 2, ok: true });
  });
});
