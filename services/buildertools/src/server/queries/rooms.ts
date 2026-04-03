import { and, eq, gte, inArray, like, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Room, RoomListItem } from "@/shared/schemas/room.ts";

import { immortalDb, sneezyDb } from "../db.ts";
import { room, roomexit, roomextra } from "../schema/immortal.ts";
import { room as sneezyRoom, zone } from "../schema/sneezy.ts";
import { escapeLike } from "./like-escape.ts";
import { ownerEq, type OwnerScope, scopePlayerId } from "./owner-scope.ts";

export async function listRooms(
  blocks: null | VnumBlock[],
  scope: OwnerScope,
): Promise<RoomListItem[]> {
  if (blocks !== null && blocks.length === 0) {
    return [];
  }

  return immortalDb
    .select({ name: room.name, sector: room.sector, vnum: room.vnum })
    .from(room)
    .where(
      and(
        ownerEq(room.player_id, scope),
        blocks === null ? undefined : vnumBlockFilter(blocks),
      ),
    )
    .orderBy(room.vnum);
}

export async function getRoom(
  vnum: number,
  scope: OwnerScope,
): Promise<null | Room> {
  const [row] = await immortalDb
    .select()
    .from(room)
    .where(and(eq(room.vnum, vnum), ownerEq(room.player_id, scope)));

  if (!row) {
    return null;
  }

  const [exits, extras] = await Promise.all([
    immortalDb
      .select()
      .from(roomexit)
      .where(and(eq(roomexit.vnum, vnum), ownerEq(roomexit.player_id, scope)))
      .orderBy(roomexit.direction),
    immortalDb
      .select()
      .from(roomextra)
      .where(
        and(eq(roomextra.vnum, vnum), ownerEq(roomextra.player_id, scope)),
      ),
  ]);

  const { block: _block, player_id: _playerId, ...roomFields } = row;
  return {
    ...roomFields,
    exits: exits.map(
      ({ player_id: _exitPlayerId, ...exitFields }) => exitFields,
    ),
    extras: extras.map(
      ({ block: _block, player_id: _extraPlayerId, ...extraFields }) =>
        extraFields,
    ),
  };
}

export async function createRoom(
  vnum: number,
  scope: OwnerScope,
  block: number,
): Promise<void> {
  // Derive zone from vnum (first zone where top >= vnum), matching C++ redit
  const [matchingZone] = await sneezyDb
    .select({ zone_nr: zone.zone_nr })
    .from(zone)
    .where(gte(zone.top, vnum))
    .orderBy(zone.zone_nr)
    .limit(1);

  // Derive coordinates from any existing room that has an exit pointing here,
  // matching the C++ make_room_coords() behavior when redit creates a new room
  const coords = await deriveCoords(vnum, scopePlayerId(scope));

  await immortalDb.insert(room).values({
    block,
    capacity: 0,
    description: "",
    height: -1,
    name: "",
    player_id: scopePlayerId(scope),
    river_dir: 0,
    river_speed: 0,
    room_flag: 1 << 17,
    sector: 60,
    spec: 0,
    telelook: 0,
    teletarg: 0,
    teletime: 0,
    vnum,
    ...coords,
    zone: matchingZone?.zone_nr ?? 1,
  });
}

export async function updateRoom(
  vnum: number,
  data: Room,
  scope: OwnerScope,
  block: number,
): Promise<void> {
  const player_id = scopePlayerId(scope);
  const { exits, extras, vnum: _vnum, ...roomFields } = data;

  await immortalDb.transaction(async (tx) => {
    await tx
      .update(room)
      .set({ ...roomFields, block, player_id })
      .where(and(eq(room.vnum, vnum), ownerEq(room.player_id, scope)));

    // Replace all exits atomically
    await tx
      .delete(roomexit)
      .where(and(eq(roomexit.vnum, vnum), ownerEq(roomexit.player_id, scope)));

    for (const exit of exits) {
      const { block: _block, vnum: _exitVnum, ...exitFields } = exit;
      await tx.insert(roomexit).values({
        ...exitFields,
        block,
        player_id,
        vnum,
      });
    }

    // Replace all extras atomically
    await tx
      .delete(roomextra)
      .where(
        and(eq(roomextra.vnum, vnum), ownerEq(roomextra.player_id, scope)),
      );

    for (const extra of extras) {
      const { vnum: _extraVnum, ...extraFields } = extra;
      await tx.insert(roomextra).values({
        ...extraFields,
        block,
        player_id,
        vnum,
      });
    }
  });
}

export async function deleteRoom(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx
      .delete(roomextra)
      .where(
        and(eq(roomextra.vnum, vnum), ownerEq(roomextra.player_id, scope)),
      );
    await tx
      .delete(roomexit)
      .where(and(eq(roomexit.vnum, vnum), ownerEq(roomexit.player_id, scope)));
    await tx
      .delete(room)
      .where(and(eq(room.vnum, vnum), ownerEq(room.player_id, scope)));
  });
}

export async function deleteRooms(
  vnums: number[],
  scope: OwnerScope,
): Promise<number> {
  let deleted = 0;
  await immortalDb.transaction(async (tx) => {
    await tx
      .delete(roomextra)
      .where(
        and(
          inArray(roomextra.vnum, vnums),
          ownerEq(roomextra.player_id, scope),
        ),
      );
    await tx
      .delete(roomexit)
      .where(
        and(inArray(roomexit.vnum, vnums), ownerEq(roomexit.player_id, scope)),
      );
    const result = await tx
      .delete(room)
      .where(and(inArray(room.vnum, vnums), ownerEq(room.player_id, scope)));
    deleted = result[0].affectedRows;
  });
  return deleted;
}

export async function getRoomName(
  vnum: number,
  scope: OwnerScope,
): Promise<null | string> {
  // Try immortal first (builder workspace), then sneezy (production)
  // Exits can point to rooms outside the builder's assigned blocks
  const [immortalRow] = await immortalDb
    .select({ name: room.name })
    .from(room)
    .where(and(eq(room.vnum, vnum), ownerEq(room.player_id, scope)))
    .limit(1);

  if (immortalRow) {
    return immortalRow.name;
  }

  const [sneezyRow] = await sneezyDb
    .select({ name: sneezyRoom.name })
    .from(sneezyRoom)
    .where(eq(sneezyRoom.vnum, vnum))
    .limit(1);

  if (sneezyRow) {
    return sneezyRow.name;
  }

  return null;
}

export async function searchRooms(
  query: string,
  scope: OwnerScope,
): Promise<Array<{ name: string; vnum: number }>> {
  // Search both immortal and sneezy since exits can point to any room
  const likeParam = `%${escapeLike(query)}%`;
  const isNumeric = /^\d+$/.test(query);

  const nameFilter = like(room.name, likeParam);
  const sneezyNameFilter = like(sneezyRoom.name, likeParam);
  const vnumFilter = isNumeric ? eq(room.vnum, Number(query)) : undefined;
  const sneezyVnumFilter = isNumeric
    ? eq(sneezyRoom.vnum, Number(query))
    : undefined;

  const [immortalRows, sneezyRows] = await Promise.all([
    immortalDb
      .select({ name: room.name, vnum: room.vnum })
      .from(room)
      .where(
        and(
          ownerEq(room.player_id, scope),
          vnumFilter ? or(vnumFilter, nameFilter) : nameFilter,
        ),
      )
      .orderBy(room.vnum)
      .limit(10),
    sneezyDb
      .select({ name: sneezyRoom.name, vnum: sneezyRoom.vnum })
      .from(sneezyRoom)
      .where(
        sneezyVnumFilter
          ? or(sneezyVnumFilter, sneezyNameFilter)
          : sneezyNameFilter,
      )
      .orderBy(sneezyRoom.vnum)
      .limit(10),
  ]);

  // Merge and deduplicate by vnum (immortal takes priority), then sort
  const seen = new Set<number>();
  const merged: Array<{ name: string; vnum: number }> = [];

  for (const row of [...immortalRows, ...sneezyRows]) {
    if (!seen.has(row.vnum)) {
      seen.add(row.vnum);
      merged.push({ name: row.name, vnum: row.vnum });
    }
  }

  merged.sort((a, b) => a.vnum - b.vnum);
  return merged.slice(0, 20);
}

export async function roomExists(
  vnum: number,
  scope: OwnerScope,
): Promise<boolean> {
  const [row] = await immortalDb
    .select({ vnum: room.vnum })
    .from(room)
    .where(and(eq(room.vnum, vnum), ownerEq(room.player_id, scope)))
    .limit(1);

  return row !== undefined;
}

function vnumBlockFilter(blocks: VnumBlock[]) {
  return or(
    ...blocks.map((b) => and(gte(room.vnum, b.start), lte(room.vnum, b.end))),
  );
}

// Direction offsets matching C++ make_room_coords() in create_rooms.cc
const DIRECTION_OFFSETS: Record<number, { x: number; y: number; z: number }> = {
  0: { x: 0, y: 1, z: 0 }, // North
  1: { x: 1, y: 0, z: 0 }, // East
  2: { x: 0, y: -1, z: 0 }, // South
  3: { x: -1, y: 0, z: 0 }, // West
  4: { x: 0, y: 0, z: 1 }, // Up
  5: { x: 0, y: 0, z: -1 }, // Down
  6: { x: 1, y: 1, z: 0 }, // NE
  7: { x: -1, y: 1, z: 0 }, // NW
  8: { x: 1, y: -1, z: 0 }, // SE
  9: { x: -1, y: -1, z: 0 }, // SW
} as const;

// When creating a new room, check if any existing room has an exit pointing to
// it. If so, derive coordinates from that source room + direction offset. This
// matches the C++ make_room_coords() behavior when redit auto-creates a room.
async function deriveCoords(
  vnum: number,
  playerId: number,
): Promise<{ x: number; y: number; z: number }> {
  const defaultCoords = { x: 0, y: 0, z: 0 };

  const [incomingExit] = await immortalDb
    .select({
      direction: roomexit.direction,
      sourceVnum: roomexit.vnum,
    })
    .from(roomexit)
    .where(
      and(eq(roomexit.destination, vnum), eq(roomexit.player_id, playerId)),
    )
    .limit(1);

  if (!incomingExit) return defaultCoords;

  const [sourceRoom] = await immortalDb
    .select({ x: room.x, y: room.y, z: room.z })
    .from(room)
    .where(
      and(eq(room.vnum, incomingExit.sourceVnum), eq(room.player_id, playerId)),
    )
    .limit(1);

  if (!sourceRoom) return defaultCoords;

  const offset = DIRECTION_OFFSETS[incomingExit.direction];
  if (!offset) return defaultCoords;

  return {
    x: sourceRoom.x + offset.x,
    y: sourceRoom.y + offset.y,
    z: sourceRoom.z + offset.z,
  };
}
