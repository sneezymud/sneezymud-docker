import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { hasPower, POWER } from "@/shared/powers.ts";
import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { roomCreateSchema, roomInputSchema } from "@/shared/schemas/room.ts";
import { isUnassignableRoomSpecProc } from "@/shared/spec-proc-access.ts";

import {
  type AuthEnv,
  canAccessVnum,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
  requireWritePower,
  resolveListOwner,
  resolveTargetOwner,
} from "../auth/middleware.ts";
import { immortalDb, isDuplicateKeyError } from "../db.ts";
import { ownerEq } from "../queries/owner-scope.ts";
import { resolvePlayerNames } from "../queries/player-names.ts";
import { EntityNotFoundError } from "../queries/publish.ts";
import {
  createRoom,
  deleteRoom,
  deleteRooms,
  getRoom,
  getRoomName,
  listRooms,
  roomExists,
  searchRooms,
  updateRoom,
} from "../queries/rooms.ts";
import { room } from "../schema/immortal.ts";

export const roomRoutes = new Hono<AuthEnv>();

roomRoutes.use(requireAuth);
roomRoutes.use(requireWritePower(POWER.REDIT, POWER.RSAVE, POWER.EDIT));

roomRoutes.get("/", async (c) => {
  const user = c.get("user");
  const resolved = resolveListOwner(c, user);
  if (resolved.kind === "forbidden")
    return c.json({ error: resolved.reason }, 403);
  if (resolved.kind === "bad_request")
    return c.json({ error: resolved.reason }, 400);
  const scope = resolved.scope;
  const blocks = user.isSenior ? null : user.blocks;
  const includeOwnerName = scope === "all" || scope.playerId !== user.playerId;
  const rows = await listRooms(blocks, scope, { includeOwnerName });
  if (includeOwnerName) {
    const ids = [
      ...new Set(
        rows.map((r) => r.player_id).filter((id): id is number => id != null),
      ),
    ];
    const names = await resolvePlayerNames(ids);
    return c.json(
      rows.map((r) => ({
        ...r,
        owner: names.get(r.player_id ?? 0) ?? "Unknown",
      })),
    );
  }
  return c.json(rows);
});

roomRoutes.post("/", jsonValidator(roomCreateSchema), async (c) => {
  const user = c.get("user");
  if (c.req.query("owner") !== undefined) {
    return c.json({ error: "owner parameter not allowed on create" }, 400);
  }
  const scope = { playerId: user.playerId };
  const data = c.req.valid("json");

  if (!canAccessVnum(data.vnum, user)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await roomExists(data.vnum, scope)) {
    return c.json({ error: "Room already exists" }, 409);
  }

  // Block index is 0 for expanded-access vnums outside own blocks
  const blockIndex = user.blocks.findIndex(
    (b) => data.vnum >= b.start && data.vnum <= b.end,
  );
  try {
    await createRoom(data.vnum, scope, blockIndex + 1);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return c.json({ error: "Room already exists" }, 409);
    }
    throw error;
  }
  const room = await getRoom(data.vnum, scope);
  return c.json(room, 201);
});

roomRoutes.get("/search", async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const query = c.req.query("q") ?? "";
  if (query.length < 2) {
    return c.json([]);
  }
  const results = await searchRooms(query, scope);
  return c.json(results);
});

roomRoutes.get("/name/:vnum", async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));
  const name = await getRoomName(vnum, scope);
  return c.json({ name, vnum });
});

roomRoutes.get("/:vnum", requireVnumAccess("room"), async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));

  const foundRoom = await getRoom(vnum, scope);
  if (!foundRoom) {
    return c.json({ error: "Room not found" }, 404);
  }

  return c.json(foundRoom);
});

roomRoutes.put(
  "/:vnum",
  requireVnumAccess("room"),
  jsonValidator(roomInputSchema),
  async (c) => {
    const user = c.get("user");
    const target = resolveTargetOwner(c, user);
    if (target.kind === "forbidden")
      return c.json({ error: target.reason }, 403);
    if (target.kind === "bad_request")
      return c.json({ error: target.reason }, 400);
    const scope = { playerId: target.playerId };
    const vnum = Number(c.req.param("vnum"));

    const [existingRow] = await immortalDb
      .select({ spec: room.spec })
      .from(room)
      .where(and(eq(room.vnum, vnum), ownerEq(room.player_id, scope)));
    if (!existingRow) {
      return c.json({ error: "Room not found" }, 404);
    }

    const data = c.req.valid("json");
    if (
      !user.isSenior &&
      !hasPower(user.powers, POWER.REDIT_ENABLED) &&
      isUnassignableRoomSpecProc(data.spec) &&
      data.spec !== existingRow.spec
    ) {
      return c.json(
        {
          error:
            'Changing "spec" to an unassignable value requires POWER_REDIT_ENABLED',
        },
        403,
      );
    }

    try {
      await updateRoom(vnum, data, scope);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return c.json({ error: "Room not found" }, 404);
      }
      throw error;
    }
    const updated = await getRoom(vnum, scope);
    return c.json(updated);
  },
);

roomRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  if (c.req.query("owner") !== undefined) {
    return c.json({ error: "owner parameter not allowed on bulk delete" }, 400);
  }
  const scope = { playerId: user.playerId };
  const { vnums } = c.req.valid("json");

  const accessChecks = vnums.map((v) => ({
    ok: canAccessVnum(v, user),
    v,
  }));
  const unauthorized = accessChecks.filter((r) => !r.ok).map((r) => r.v);
  if (unauthorized.length > 0) {
    return c.json(
      { error: `Vnums outside assigned blocks: ${unauthorized.join(", ")}` },
      403,
    );
  }

  const deleted = await deleteRooms(vnums, scope);
  return c.json({ deleted, ok: true });
});

roomRoutes.delete("/:vnum", requireVnumAccess("room"), async (c) => {
  const user = c.get("user");
  const target = resolveTargetOwner(c, user);
  if (target.kind === "forbidden") return c.json({ error: target.reason }, 403);
  if (target.kind === "bad_request")
    return c.json({ error: target.reason }, 400);
  const scope = { playerId: target.playerId };
  const vnum = Number(c.req.param("vnum"));

  if (!(await roomExists(vnum, scope))) {
    return c.json({ error: "Room not found" }, 404);
  }

  await deleteRoom(vnum, scope);
  return c.json({ ok: true });
});
