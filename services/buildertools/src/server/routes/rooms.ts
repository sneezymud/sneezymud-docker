import { Hono } from "hono";

import { hasPower, POWER } from "@/shared/powers.ts";
import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { roomCreateSchema, roomInputSchema } from "@/shared/schemas/room.ts";
import { isUnassignableRoomSpecProc } from "@/shared/spec-proc-access.ts";

import {
  type AuthEnv,
  canAccessVnum,
  hasExpandedAccess,
  jsonValidator,
  requireAuth,
  requirePower,
  requireVnumAccess,
} from "../auth/middleware.ts";
import { isDuplicateKeyError } from "../db.ts";
import { getOtherBuildersBlocks } from "../queries/auth.ts";
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

export const roomRoutes = new Hono<AuthEnv>();

roomRoutes.use(requireAuth);
roomRoutes.use(requirePower(POWER.REDIT, POWER.RSAVE, POWER.EDIT));

roomRoutes.get("/", async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerId };
  const blocks = hasExpandedAccess(user.powers, "room") ? null : user.blocks;
  const rooms = await listRooms(blocks, scope);
  return c.json(rooms);
});

roomRoutes.post("/", jsonValidator(roomCreateSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerId };
  const data = c.req.valid("json");

  if (!(await canAccessVnum(data.vnum, user, "room"))) {
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
  const scope = { owner: user.playerId };
  const query = c.req.query("q") ?? "";
  if (query.length < 2) {
    return c.json([]);
  }
  const results = await searchRooms(query, scope);
  return c.json(results);
});

roomRoutes.get("/name/:vnum", async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerId };
  const vnum = Number(c.req.param("vnum"));
  const name = await getRoomName(vnum, scope);
  return c.json({ name, vnum });
});

roomRoutes.get("/:vnum", requireVnumAccess("room"), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerId };
  const vnum = Number(c.req.param("vnum"));

  const room = await getRoom(vnum, scope);
  if (!room) {
    return c.json({ error: "Room not found" }, 404);
  }

  return c.json(room);
});

roomRoutes.put(
  "/:vnum",
  requireVnumAccess("room"),
  jsonValidator(roomInputSchema),
  async (c) => {
    const user = c.get("user");
    const scope = { owner: user.playerId };
    const vnum = Number(c.req.param("vnum"));

    const current = await getRoom(vnum, scope);
    if (!current) {
      return c.json({ error: "Room not found" }, 404);
    }

    const data = c.req.valid("json");
    if (
      !hasPower(user.powers, POWER.REDIT_ENABLED) &&
      isUnassignableRoomSpecProc(data.spec)
    ) {
      data.spec = current.spec;
    }

    // Determine which block this vnum belongs to for the owner field
    const blockIndex = user.blocks.findIndex(
      (b) => vnum >= b.start && vnum <= b.end,
    );
    const block = blockIndex + 1; // 1-indexed block number

    await updateRoom(vnum, data, scope, block);
    const updated = await getRoom(vnum, scope);
    return c.json(updated);
  },
);

roomRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerId };
  const { vnums } = c.req.valid("json");

  const otherBlocks = hasExpandedAccess(user.powers, "room")
    ? await getOtherBuildersBlocks(user.playerId)
    : undefined;
  const accessChecks = await Promise.all(
    vnums.map(async (v) => ({
      ok: await canAccessVnum(v, user, "room", otherBlocks),
      v,
    })),
  );
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
  const scope = { owner: user.playerId };
  const vnum = Number(c.req.param("vnum"));

  if (!(await roomExists(vnum, scope))) {
    return c.json({ error: "Room not found" }, 404);
  }

  await deleteRoom(vnum, scope);
  return c.json({ ok: true });
});
