import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import type { SessionUser } from "@/shared/schemas/auth.ts";

import type { AuthEnv } from "./middleware.ts";

import { resolveListOwner, resolveTargetOwner } from "./middleware.ts";

type Ctx = Parameters<typeof resolveTargetOwner>[0];

function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    blocks: [],
    isSenior: false,
    playerId: 42,
    playerName: "test",
    powers: [],
    username: "test",
    ...overrides,
  };
}

async function makeCtx(query: string): Promise<Ctx> {
  const app = new Hono<AuthEnv>();
  const state: { captured: Ctx | undefined } = { captured: undefined };
  app.get("/x", (c) => {
    state.captured = c;
    return c.text("ok");
  });
  await app.request(`/x${query}`);
  if (state.captured === undefined) throw new Error("Handler did not run");
  return state.captured;
}

describe("resolveTargetOwner", () => {
  test("absent ?owner returns caller playerId", async () => {
    const ctx = await makeCtx("");
    const result = resolveTargetOwner(ctx, makeUser({ playerId: 42 }));
    expect(result).toEqual({ kind: "ok", playerId: 42 });
  });

  test("?owner=<self> returns caller playerId", async () => {
    const ctx = await makeCtx("?owner=42");
    const result = resolveTargetOwner(ctx, makeUser({ playerId: 42 }));
    expect(result).toEqual({ kind: "ok", playerId: 42 });
  });

  test("?owner=<other> for non-senior returns forbidden", async () => {
    const ctx = await makeCtx("?owner=99");
    const result = resolveTargetOwner(
      ctx,
      makeUser({ isSenior: false, playerId: 42 }),
    );
    expect(result.kind).toBe("forbidden");
  });

  test("?owner=<other> for senior returns target", async () => {
    const ctx = await makeCtx("?owner=99");
    const result = resolveTargetOwner(
      ctx,
      makeUser({ isSenior: true, playerId: 42 }),
    );
    expect(result).toEqual({ kind: "ok", playerId: 99 });
  });

  test("?owner=abc returns bad_request", async () => {
    const ctx = await makeCtx("?owner=abc");
    const result = resolveTargetOwner(ctx, makeUser({ isSenior: true }));
    expect(result.kind).toBe("bad_request");
  });

  test("?owner=0 returns bad_request", async () => {
    const ctx = await makeCtx("?owner=0");
    const result = resolveTargetOwner(ctx, makeUser({ isSenior: true }));
    expect(result.kind).toBe("bad_request");
  });

  test("?owner=-1 returns bad_request", async () => {
    const ctx = await makeCtx("?owner=-1");
    const result = resolveTargetOwner(ctx, makeUser({ isSenior: true }));
    expect(result.kind).toBe("bad_request");
  });

  test("?owner=mine is rejected (list-only literal)", async () => {
    const ctx = await makeCtx("?owner=mine");
    const result = resolveTargetOwner(ctx, makeUser({ isSenior: true }));
    expect(result.kind).toBe("bad_request");
  });

  test("?owner=all is rejected (list-only literal)", async () => {
    const ctx = await makeCtx("?owner=all");
    const result = resolveTargetOwner(ctx, makeUser({ isSenior: true }));
    expect(result.kind).toBe("bad_request");
  });
});

describe("resolveListOwner", () => {
  test("absent ?owner returns mine scope", async () => {
    const ctx = await makeCtx("");
    const result = resolveListOwner(ctx, makeUser({ playerId: 42 }));
    expect(result).toEqual({ kind: "ok", scope: { playerId: 42 } });
  });

  test("?owner=mine returns mine scope", async () => {
    const ctx = await makeCtx("?owner=mine");
    const result = resolveListOwner(ctx, makeUser({ playerId: 42 }));
    expect(result).toEqual({ kind: "ok", scope: { playerId: 42 } });
  });

  test("?owner=all for non-senior returns forbidden", async () => {
    const ctx = await makeCtx("?owner=all");
    const result = resolveListOwner(ctx, makeUser({ isSenior: false }));
    expect(result.kind).toBe("forbidden");
  });

  test("?owner=all for senior returns all scope", async () => {
    const ctx = await makeCtx("?owner=all");
    const result = resolveListOwner(ctx, makeUser({ isSenior: true }));
    expect(result).toEqual({ kind: "ok", scope: "all" });
  });

  test("?owner=<numeric other> delegates to resolveTargetOwner (senior)", async () => {
    const ctx = await makeCtx("?owner=99");
    const result = resolveListOwner(
      ctx,
      makeUser({ isSenior: true, playerId: 42 }),
    );
    expect(result).toEqual({ kind: "ok", scope: { playerId: 99 } });
  });

  test("?owner=<numeric self> returns mine scope (non-senior)", async () => {
    const ctx = await makeCtx("?owner=42");
    const result = resolveListOwner(
      ctx,
      makeUser({ isSenior: false, playerId: 42 }),
    );
    expect(result).toEqual({ kind: "ok", scope: { playerId: 42 } });
  });
});
