import type { Hono } from "hono";

import type { SessionUser } from "@/shared/schemas/auth.ts";

import { POWER } from "@/shared/powers.ts";

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
 * Log in as the test builder and return the session cookie string.
 */
export async function getAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: testUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  return cookie;
}

/**
 * Log in as the other builder and return the session cookie string.
 */
export async function getOtherAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: otherUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  return cookie;
}

/**
 * Log in as the expanded-access builder and return the session cookie string.
 */
export async function getExpandedAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: expandedUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  return cookie;
}

/**
 * Log in as the LOW-only builder and return the session cookie string.
 */
export async function getLowOnlyAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: lowOnlyUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  return cookie;
}

/**
 * Log in as the no-blocks user and return the session cookie string.
 */
export async function getNoBlocksAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: noBlocksUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  return cookie;
}

export async function getViewOnlyAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: viewOnlyUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  return cookie;
}

export async function getNoLimitsOnlyAuthCookie(app: Hono): Promise<string> {
  const res = await app.request("/api/auth/login", {
    body: JSON.stringify({
      password: TEST_PASSWORD,
      username: noLimitsOnlyUser.username,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });
  const cookie = res.headers.get("Set-Cookie");
  if (!cookie) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
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
