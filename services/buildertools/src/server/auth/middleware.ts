import type { ZodType } from "zod";

import { zValidator } from "@hono/zod-validator";
import { createMiddleware } from "hono/factory";

import type { SessionUser, VnumBlock } from "@/shared/schemas/auth.ts";

import { hasPower, POWER } from "@/shared/powers.ts";

import { getOtherBuildersBlocks } from "../queries/auth.ts";
import { isVnumInBlocks } from "../queries/vnum-access.ts";
import { getSession, touchSession } from "./session.ts";

export type EntityType = "mob" | "object" | "room";

export interface AuthEnv {
  Variables: {
    user: SessionUser;
  };
}

export function hasExpandedAccess(
  powers: number[],
  entityType: EntityType,
): boolean {
  if (!hasPower(powers, POWER.LOW)) return false;
  if (entityType === "room" && !hasPower(powers, POWER.NO_LIMITS)) return false;
  return true;
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

export function requireVnumAccess(entityType: EntityType) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const vnum = Number(c.req.param("vnum"));
    if (!Number.isInteger(vnum) || vnum < 0) {
      return c.json({ error: "Invalid vnum" }, 400);
    }
    const user = c.get("user");
    if (isVnumInBlocks(vnum, user.blocks)) {
      return next();
    }
    if (hasExpandedAccess(user.powers, entityType)) {
      const otherBlocks = await getOtherBuildersBlocks(user.playerName);
      if (!isVnumInBlocks(vnum, otherBlocks)) {
        return next();
      }
    }
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  });
}

export async function canAccessVnum(
  vnum: number,
  user: SessionUser,
  entityType: EntityType,
  prefetchedOtherBlocks?: VnumBlock[],
): Promise<boolean> {
  if (isVnumInBlocks(vnum, user.blocks)) return true;
  if (!hasExpandedAccess(user.powers, entityType)) return false;
  const otherBlocks =
    prefetchedOtherBlocks ?? (await getOtherBuildersBlocks(user.playerName));
  return !isVnumInBlocks(vnum, otherBlocks);
}

export function requirePower(...requiredPowers: number[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("user");
    for (const p of requiredPowers) {
      if (!hasPower(user.powers, p)) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }
    }
    return next();
  });
}

export function jsonValidator<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "Validation failed",
          issues: result.error.issues.map((i) => ({
            message: i.message,
            path: i.path.map(String),
          })),
        },
        400,
      );
    }
    return;
  });
}
