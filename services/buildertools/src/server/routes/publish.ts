import { inArray } from "drizzle-orm";
import { Hono } from "hono";

import { POWER } from "@/shared/powers.ts";
import { bulkPublishSchema } from "@/shared/schemas/publish.ts";

import {
  type AuthEnv,
  canAccessVnum,
  jsonValidator,
  requireAuth,
  requirePower,
  requireVnumAccess,
} from "../auth/middleware.ts";
import { sneezyDb } from "../db.ts";
import { getDashboardEntities } from "../queries/dashboard.ts";
import { getMobResponse } from "../queries/mob-responses.ts";
import { getMob } from "../queries/mobs.ts";
import { getObject } from "../queries/objects.ts";
import {
  getSneezyMob,
  getSneezyMobResponse,
  getSneezyObject,
  getSneezyRoom,
  publishBulk,
  publishMob,
  publishMobResponse,
  publishObject,
  publishRoom,
} from "../queries/publish.ts";
import { getRoom } from "../queries/rooms.ts";
import { player } from "../schema/sneezy.ts";

export const publishRoutes = new Hono<AuthEnv>();
publishRoutes.use(requireAuth);

// ---------------------------------------------------------------------------
// Dashboard endpoint
// ---------------------------------------------------------------------------

publishRoutes.get("/dashboard", requirePower(POWER.LOW), async (c) => {
  const user = c.get("user");
  const ownerFilter = c.req.query("owner") ?? "mine";
  const scope =
    ownerFilter === "all" && user.isSenior
      ? ("all" as const)
      : { playerId: user.playerId };

  const entities = await getDashboardEntities(scope);

  // Resolve player IDs to names
  const playerIds = [...new Set(entities.map((e) => e.playerId))];
  const playerNames = new Map<number, string>();
  if (playerIds.length > 0) {
    const rows = await sneezyDb
      .select({ id: player.id, name: player.name })
      .from(player)
      .where(inArray(player.id, playerIds));
    for (const row of rows) {
      playerNames.set(row.id, row.name ?? "Unknown");
    }
  }

  return c.json(
    entities.map(({ playerId, ...rest }) => ({
      ...rest,
      owner: playerNames.get(playerId) ?? "Unknown",
    })),
  );
});

// ---------------------------------------------------------------------------
// Diff endpoints (read-only comparison)
// ---------------------------------------------------------------------------

publishRoutes.get("/diff/rooms/:vnum", requireVnumAccess("room"), async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));
  const scope = { playerId: user.playerId };
  const immortal = await getRoom(vnum, scope);
  const production = await getSneezyRoom(vnum);
  return c.json({ immortal, production });
});

publishRoutes.get("/diff/mobs/:vnum", requireVnumAccess("mob"), async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));
  const scope = { playerId: user.playerId };
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
    const scope = { playerId: user.playerId };
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
    const scope = { playerId: user.playerId };
    const immortal = await getMobResponse(vnum, scope);
    const production = await getSneezyMobResponse(vnum);
    return c.json({ immortal, production });
  },
);

// ---------------------------------------------------------------------------
// Publish endpoints (copy immortal -> sneezy)
// ---------------------------------------------------------------------------

publishRoutes.post(
  "/rooms/:vnum",
  requirePower(POWER.LOW),
  requireVnumAccess("room"),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));
    await publishRoom(vnum, { playerId: user.playerId });
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
    await publishMob(vnum, { playerId: user.playerId });
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
    await publishObject(vnum, { playerId: user.playerId });
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
    await publishMobResponse(vnum, { playerId: user.playerId });
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

    for (const entity of entities) {
      if (!canAccessVnum(entity.vnum, user)) {
        return c.json(
          { error: `Vnum ${entity.vnum} outside assigned blocks` },
          403,
        );
      }
    }

    await publishBulk(entities.map((e) => ({ ...e, playerId: user.playerId })));
    return c.json({ ok: true });
  },
);
