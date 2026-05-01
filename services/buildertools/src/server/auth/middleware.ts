import type { Context } from "hono";
import type { ZodType } from "zod";

import { zValidator } from "@hono/zod-validator";
import { createMiddleware } from "hono/factory";

import type { SessionUser } from "@/shared/schemas/auth.ts";

import { hasPower } from "@/shared/powers.ts";

import type { OwnerScope } from "../queries/owner-scope.ts";

import { isVnumInBlocks } from "../queries/vnum-access.ts";
import { getSession, touchSession } from "./session.ts";

export type EntityType = "mob" | "object" | "room";

export interface AuthEnv {
  Variables: {
    user: SessionUser;
  };
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.req.header("X-Requested-With") !== "XMLHttpRequest") {
    return c.json({ error: "Invalid request origin" }, 403);
  }
  const user = getSession(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  await touchSession(c);
  c.set("user", user);
  return next();
});

export type TargetOwnerResult =
  | { kind: "bad_request"; reason: string }
  | { kind: "forbidden"; reason: string }
  | { kind: "ok"; playerId: number };

export type ListOwnerResult =
  | { kind: "bad_request"; reason: string }
  | { kind: "forbidden"; reason: string }
  | { kind: "ok"; scope: OwnerScope };

export function requireVnumAccess(_entityType: EntityType) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const vnum = Number(c.req.param("vnum"));
    if (!Number.isInteger(vnum) || vnum < 0) {
      return c.json({ error: "Invalid vnum" }, 400);
    }
    const user = c.get("user");
    if (user.isSenior || isVnumInBlocks(vnum, user.blocks)) {
      return next();
    }
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  });
}

export function canAccessVnum(vnum: number, user: SessionUser): boolean {
  return user.isSenior || isVnumInBlocks(vnum, user.blocks);
}

export function requirePower(...requiredPowers: number[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("user");
    if (user.isSenior) return next();
    for (const p of requiredPowers) {
      if (!hasPower(user.powers, p)) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }
    return next();
  });
}

export function requireWritePower(...requiredPowers: number[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    if (c.req.method === "GET") return next();
    const user = c.get("user");
    if (user.isSenior) return next();
    for (const p of requiredPowers) {
      if (!hasPower(user.powers, p)) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }
    return next();
  });
}

export function resolveTargetOwner(
  c: Context<AuthEnv>,
  user: SessionUser,
): TargetOwnerResult {
  const raw = c.req.query("owner");
  if (raw === undefined) {
    return { kind: "ok", playerId: user.playerId };
  }
  if (raw === "mine" || raw === "all") {
    return {
      kind: "bad_request",
      reason: `"${raw}" is only valid on list endpoints`,
    };
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { kind: "bad_request", reason: "Invalid owner parameter" };
  }
  if (parsed !== user.playerId && !user.isSenior) {
    return {
      kind: "forbidden",
      reason: "Cross-owner access requires senior privileges",
    };
  }
  return { kind: "ok", playerId: parsed };
}

export function resolveListOwner(
  c: Context<AuthEnv>,
  user: SessionUser,
): ListOwnerResult {
  const raw = c.req.query("owner");
  if (raw === undefined || raw === "mine") {
    return { kind: "ok", scope: { playerId: user.playerId } };
  }
  if (raw === "all") {
    if (!user.isSenior) {
      return {
        kind: "forbidden",
        reason: "Cross-owner access requires senior privileges",
      };
    }
    return { kind: "ok", scope: "all" };
  }
  const target = resolveTargetOwner(c, user);
  if (target.kind !== "ok") return target;
  return { kind: "ok", scope: { playerId: target.playerId } };
}

export function jsonValidator<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "Validation failed",
          issues: result.error.issues.map(({ message, path }) => ({
            message,
            path: path.map(String),
          })),
        },
        400,
      );
    }
    return;
  });
}
