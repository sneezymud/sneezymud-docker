import { Hono } from "hono";

import { POWER } from "@/shared/powers.ts";
import { bulkPublishSchema } from "@/shared/schemas/publish.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requirePower,
  requireVnumAccess,
  resolveListOwner,
  resolveTargetOwner,
} from "../auth/middleware.ts";
import { isConstraintError } from "../db.ts";
import { getDashboardEntities } from "../queries/dashboard.ts";
import { getMobResponse } from "../queries/mob-responses.ts";
import { getMob } from "../queries/mobs.ts";
import { getObject } from "../queries/objects.ts";
import { resolvePlayerNames } from "../queries/player-names.ts";
import {
  EntityNotFoundError,
  getSneezyMob,
  getSneezyMobResponse,
  getSneezyObject,
  getSneezyRoom,
  MobResponseMissingParentError,
  publishBulk,
  publishMob,
  publishMobResponse,
  publishObject,
  publishRoom,
} from "../queries/publish.ts";
import { getRoom } from "../queries/rooms.ts";

export const publishRoutes = new Hono<AuthEnv>();
publishRoutes.use(requireAuth);

// ---------------------------------------------------------------------------
// Dashboard endpoint
// ---------------------------------------------------------------------------

publishRoutes.get("/dashboard", requirePower(POWER.LOW), async (c) => {
  const user = c.get("user");
  const resolved = resolveListOwner(c, user);
  if (resolved.kind === "forbidden")
    return c.json({ error: resolved.reason }, 403);
  if (resolved.kind === "bad_request")
    return c.json({ error: resolved.reason }, 400);

  const entities = await getDashboardEntities(resolved.scope);

  const playerNames = await resolvePlayerNames(entities.map((e) => e.playerId));

  return c.json(
    entities.map((e) => ({
      ...e,
      owner: playerNames.get(e.playerId) ?? "Unknown",
    })),
  );
});

// ---------------------------------------------------------------------------
// Diff endpoints (read-only comparison)
// ---------------------------------------------------------------------------

publishRoutes.get("/diff/rooms/:vnum", requireVnumAccess("room"), async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const immortal = await getRoom(vnum, scope);
  const production = await getSneezyRoom(vnum);
  return c.json({ immortal, production });
});

publishRoutes.get("/diff/mobs/:vnum", requireVnumAccess("mob"), async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const immortal = await getMob(vnum, scope);
  const production = await getSneezyMob(vnum);
  return c.json({ immortal, production });
});

publishRoutes.get(
  "/diff/objects/:vnum",
  requireVnumAccess("object"),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    const scope = { playerId: target.playerId };
    const immortal = await getObject(vnum, scope);
    const production = await getSneezyObject(vnum);
    return c.json({ immortal, production });
  },
);

publishRoutes.get(
  "/diff/mob-responses/:vnum",
  requireVnumAccess("mob"),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    const scope = { playerId: target.playerId };
    const immortal = await getMobResponse(vnum, scope);
    const production = await getSneezyMobResponse(vnum);
    return c.json({ immortal, production });
  },
);

// ---------------------------------------------------------------------------
// Publish endpoints (copy immortal -> sneezy)
//
// Senior callers may publish any builder's draft by passing
// ?owner=<playerId>. This matches in-game `low mvroom <builder> <block>
// <vnums>` / `low mvmob <builder> <vnums>` / etc., which require only
// POWER_LOW and operate on the target builder's immortal rows - NOT on
// the caller's. The web app differs from the C++ command in one small
// way: the web app does not require a `block` argument because each
// (player_id, vnum) is uniquely keyed in the immortal schema, so
// there is no ambiguity to resolve.
//
// Absence of `?owner=` defaults to the caller's own playerId.
// Non-senior callers passing any ?owner= value that does not equal
// their own playerId receive 403 from resolveTargetOwner.
// ---------------------------------------------------------------------------

publishRoutes.post(
  "/rooms/:vnum",
  requirePower(POWER.LOW),
  requireVnumAccess("room"),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    try {
      await publishRoom(vnum, { playerId: target.playerId });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (isConstraintError(error)) {
        return c.json({ error: "Constraint violation" }, 422);
      }
      throw error;
    }
    return c.json({ ok: true });
  },
);

publishRoutes.post(
  "/mobs/:vnum",
  requirePower(POWER.LOW),
  requireVnumAccess("mob"),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    try {
      await publishMob(vnum, { playerId: target.playerId });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (isConstraintError(error)) {
        return c.json({ error: "Constraint violation" }, 422);
      }
      throw error;
    }
    return c.json({ ok: true });
  },
);

publishRoutes.post(
  "/objects/:vnum",
  requirePower(POWER.LOW),
  requireVnumAccess("object"),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    try {
      await publishObject(vnum, { playerId: target.playerId });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (isConstraintError(error)) {
        return c.json({ error: "Constraint violation" }, 422);
      }
      throw error;
    }
    return c.json({ ok: true });
  },
);

publishRoutes.post(
  "/mob-responses/:vnum",
  requirePower(POWER.LOW),
  requireVnumAccess("mob"),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    try {
      await publishMobResponse(vnum, { playerId: target.playerId });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof MobResponseMissingParentError) {
        return c.json({ error: error.message }, 422);
      }
      if (isConstraintError(error)) {
        return c.json({ error: "Constraint violation" }, 422);
      }
      throw error;
    }
    return c.json({ ok: true });
  },
);

publishRoutes.post(
  "/bulk",
  requirePower(POWER.LOW),
  jsonValidator(bulkPublishSchema),
  async (c) => {
    const user = c.get("user");
    const { entities } = c.req.valid("json");

    // Senior gate: non-seniors cannot target other owners.
    //
    // Note: requirePower(POWER.LOW) runs before this loop, and per
    // shared/powers.ts SENIOR_POWERS = [POWER.LOW, POWER.NO_LIMITS,
    // POWER.WIZARD]. Anyone with POWER.LOW is automatically isSenior=true,
    // so the !user.isSenior branch is theoretically unreachable today.
    // The explicit check is retained as a defense-in-depth guard - if the
    // SENIOR_POWERS composition changes in the future (e.g., POWER.LOW is
    // removed from the senior tier), this loop must be the first line of
    // defense preventing a POWER_LOW holder from publishing another
    // builder's work.
    for (const entry of entities) {
      if (entry.ownerPlayerId !== user.playerId && !user.isSenior) {
        return c.json(
          { error: "Cross-owner bulk publish requires senior privileges" },
          403,
        );
      }
    }

    // NOTE: the previous canAccessVnum(entry.vnum, user) loop is deleted.
    // requirePower(POWER.LOW) implies isSenior, and canAccessVnum returns
    // true for any senior regardless of vnum. The loop had no reachable
    // failure branch (L7/H10).

    try {
      await publishBulk(
        entities.map((e) => ({
          ownerPlayerId: e.ownerPlayerId,
          type: e.type,
          vnum: e.vnum,
        })),
      );
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof MobResponseMissingParentError) {
        return c.json({ error: error.message }, 422);
      }
      if (isConstraintError(error)) {
        return c.json({ error: "Constraint violation" }, 422);
      }
      throw error;
    }
    return c.json({ ok: true });
  },
);
