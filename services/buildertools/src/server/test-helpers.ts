import type { Hono } from "hono";

import { expect } from "bun:test";
import { sql } from "drizzle-orm";

import type { SessionUser } from "@/shared/schemas/auth.ts";

import { POWER } from "@/shared/powers.ts";

import { immortalDb } from "./db.ts";

// All powers a fully-privileged builder would have
const ALL_BUILDER_POWERS = [
  POWER.BUILDER,
  POWER.EDIT,
  POWER.MEDIT,
  POWER.MEDIT_IMP_POWER,
  POWER.OEDIT,
  POWER.OEDIT_APPLYS,
  POWER.OEDIT_COST,
  POWER.OEDIT_IMP_POWER,
  POWER.OEDIT_NOPROTOS,
  POWER.OEDIT_WEAPONS,
  POWER.REDIT,
  POWER.REDIT_ENABLED,
  POWER.RSAVE,
];

// Test builder: vnum blocks 100-199, all powers
export const testUser: SessionUser = {
  blocks: [{ end: 199, start: 100 }],
  isSenior: false,
  playerId: 99_999,
  playerName: "TestBuilder",
  powers: ALL_BUILDER_POWERS,
  username: "testbuilder",
};

// Second builder: same vnum blocks 100-199, partial powers (mob + object only)
export const otherUser: SessionUser = {
  blocks: [{ end: 199, start: 100 }],
  isSenior: false,
  playerId: 99_997,
  playerName: "OtherBuilder",
  powers: [
    POWER.BUILDER,
    POWER.EDIT,
    POWER.MEDIT,
    POWER.OEDIT,
    POWER.REDIT,
    POWER.RSAVE,
  ],
  username: "otherbuilder",
};

// Senior builder: own blocks 200-299, POWER_LOW + NO_LIMITS qualifies as senior
export const expandedUser: SessionUser = {
  blocks: [{ end: 299, start: 200 }],
  isSenior: true,
  playerId: 99_996,
  playerName: "ExpandedBuilder",
  powers: [
    POWER.BUILDER,
    POWER.EDIT,
    POWER.LOW,
    POWER.MEDIT,
    POWER.NO_LIMITS,
    POWER.OEDIT,
    POWER.REDIT,
    POWER.RSAVE,
  ],
  username: "expandedbuilder",
};

// Senior builder: own blocks 300-399, POWER_LOW qualifies as senior
export const lowOnlyUser: SessionUser = {
  blocks: [
    { end: 399, start: 300 },
    { end: 599, start: 500 },
  ],
  isSenior: true,
  playerId: 99_995,
  playerName: "LowOnlyBuilder",
  powers: [
    POWER.BUILDER,
    POWER.EDIT,
    POWER.LOW,
    POWER.MEDIT,
    POWER.OEDIT,
    POWER.REDIT,
    POWER.RSAVE,
  ],
  username: "lowonlybuilder",
};

// No-blocks user: POWER_BUILDER only, no vnum blocks, not senior
export const noBlocksUser: SessionUser = {
  blocks: [],
  isSenior: false,
  playerId: 99_998,
  playerName: "NoBlocks",
  powers: [POWER.BUILDER],
  username: "noblocks",
};

// Two characters on the same account (account_id 99990). Used by TEST-REFRESH
// to verify refreshSessionUser filters on player.id, not account.name.
export const multiCharA: SessionUser = {
  blocks: [{ end: 699, start: 600 }],
  isSenior: true,
  playerId: 99_990,
  playerName: "MultiCharA",
  powers: [
    POWER.BUILDER,
    POWER.EDIT,
    POWER.LOW,
    POWER.MEDIT,
    POWER.NO_LIMITS,
    POWER.OEDIT,
    POWER.REDIT,
    POWER.RSAVE,
  ],
  username: "multicharbuilder",
};

export const multiCharB: SessionUser = {
  blocks: [{ end: 799, start: 700 }],
  isSenior: false,
  playerId: 99_989,
  playerName: "MultiCharB",
  powers: [POWER.BUILDER],
  username: "multicharbuilder", // same account username
};

// Senior tier but no edit powers: tests read-only API paths in cross-owner mode
export const viewOnlyUser: SessionUser = {
  blocks: [{ end: 90_099, start: 90_000 }],
  isSenior: true,
  playerId: 99_993,
  playerName: "ViewOnly",
  powers: [POWER.BUILDER, POWER.LOW],
  username: "viewonly",
};

// Senior via NO_LIMITS alone (no POWER_LOW): tests TEST-1e
export const noLimitsOnlyUser: SessionUser = {
  blocks: [{ end: 90_199, start: 90_100 }],
  isSenior: true,
  playerId: 99_992,
  playerName: "NoLimitsOnly",
  powers: [
    POWER.BUILDER,
    POWER.EDIT,
    POWER.MEDIT,
    POWER.NO_LIMITS,
    POWER.OEDIT,
    POWER.REDIT,
    POWER.RSAVE,
  ],
  username: "nolimitsonly",
};

// Non-builder user: has account + wizdata but NO POWER_BUILDER
// Used to test the not_immortal auth rejection path
export const nonBuilderUser = {
  password: "testpass",
  playerName: "NonBuilder",
  username: "nonbuilder",
};

const TEST_PASSWORD = "testpass";

/**
 * Log in as the given user and return the session cookie string.
 */
export async function getAuthCookie(
  app: Hono,
  username: string,
): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(
      `Login failed for ${username} (${res.status}): ${await res.text()}`,
    );
  }
  return cookie;
}

/**
 * Attempt login as the non-builder user. This user lacks POWER_BUILDER
 * so login should return 403 - this helper returns the Response directly
 * rather than extracting a cookie.
 */
export async function loginAsNonBuilder(app: Hono): Promise<Response> {
  return app.request("/api/auth/login", {
    body: JSON.stringify({
      password: nonBuilderUser.password,
      username: nonBuilderUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
}

/**
 * Make an authenticated request to the app.
 */
export async function authRequest(
  app: Hono,
  path: string,
  cookie: string,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  headers.set("Cookie", cookie);
  headers.set("X-Requested-With", "XMLHttpRequest");
  return app.request(path, { ...options, headers });
}

const JSON_HEADERS = { "Content-Type": "application/json" };

/** POST a JSON body via authRequest. */
export function postJson(
  app: Hono,
  path: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return authRequest(app, path, cookie, {
    body: JSON.stringify(body),
    headers: JSON_HEADERS,
    method: "POST",
  });
}

/** PUT a JSON body via authRequest. */
export function putJson(
  app: Hono,
  path: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return authRequest(app, path, cookie, {
    body: JSON.stringify(body),
    headers: JSON_HEADERS,
    method: "PUT",
  });
}

/** DELETE via authRequest with no body. */
export function delJson(
  app: Hono,
  path: string,
  cookie: string,
): Promise<Response> {
  return authRequest(app, path, cookie, { method: "DELETE" });
}

/** DELETE via authRequest with a `{ vnums }` body for bulk endpoints. */
export function bulkDelJson(
  app: Hono,
  path: string,
  cookie: string,
  vnums: number[],
): Promise<Response> {
  return authRequest(app, path, cookie, {
    body: JSON.stringify({ vnums }),
    headers: JSON_HEADERS,
    method: "DELETE",
  });
}

/**
 * Extract the session cookie from a login response, throwing if absent.
 */
export function extractCookie(res: Response): string {
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error("Expected Set-Cookie header");
  }
  return cookie;
}

/** Create an entity in immortal via API and update it with full data. */
export async function createAndUpdate({
  app,
  cookie,
  entityType,
  updatePayload,
  vnum,
}: {
  app: Hono;
  cookie: string;
  entityType: "mobs" | "objects" | "rooms";
  updatePayload: Record<string, unknown>;
  vnum: number;
}) {
  const createRes = await authRequest(app, `/api/${entityType}`, cookie, {
    body: JSON.stringify({ vnum }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(createRes.status).toBe(201);

  const putRes = await authRequest(app, `/api/${entityType}/${vnum}`, cookie, {
    body: JSON.stringify({ ...updatePayload, vnum }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  expect(putRes.status).toBe(200);
}

/**
 * Factory functions for valid entity payloads. Each returns a complete
 * payload suitable for PUT requests. Override specific fields as needed.
 */
export function validRoomPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    capacity: 0,
    description: "A nondescript room.",
    exits: [],
    extras: [],
    height: 0,
    name: "test room",
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
    ...overrides,
  };
}

export function validMobPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
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
    description: "A test mob.",
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
    long_desc: "A test mob stands here.",
    max_exist: 0,
    name: "test mob",
    per: 0,
    race: 0,
    sex: 0,
    short_desc: "a test mob",
    skin: 0,
    spe: 0,
    spec_proc: 0,
    str: 0,
    tohit: 0,
    vision: 0,
    vnum: 100,
    weight: 0,
    wis: 0,
    ...overrides,
  };
}

/**
 * Delete all rows for the given vnums across every entity table (rooms,
 * mobs, objects, mob-responses) and their child tables. FK-safe order.
 * Pass `immortalDb` to clean the builder workspace; pass `sneezyDb` to
 * clean the production database.
 */
export async function cleanupTestVnums({
  db,
  vnums,
}: {
  db: typeof immortalDb;
  vnums: readonly number[];
}) {
  await db.execute(sql`DELETE FROM roomextra WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM roomexit WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM room WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM mob_extra WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM mob_imm WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM mobresponses WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM mob WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM objaffect WHERE vnum IN ${vnums}`);
  await db.execute(sql`DELETE FROM objextra WHERE vnum IN ${vnums}`);
  return db.execute(sql`DELETE FROM obj WHERE vnum IN ${vnums}`);
}

export function validObjPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    action_desc: "",
    action_flag: 0,
    affects: [],
    can_be_seen: 0,
    cur_struct: 0,
    decay: 0,
    extras: [],
    long_desc: "A test object lies here.",
    material: 0,
    max_exist: 0,
    max_struct: 0,
    name: "test object",
    price: 0,
    short_desc: "a test object",
    spec_proc: 0,
    type: 0,
    val0: 0,
    val1: 0,
    val2: 0,
    val3: 0,
    vnum: 100,
    volume: 0,
    wear_flag: 0,
    weight: 0,
    ...overrides,
  };
}
