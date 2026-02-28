import { and, eq, gte, inArray, like, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Room, RoomListItem } from "@/shared/schemas/room.ts";

import { immortalDb, sneezyDb } from "../db.ts";
import { room, roomexit, roomextra } from "../schema/immortal.ts";
import { room as sneezyRoom, zone } from "../schema/sneezy.ts";
import { escapeLike } from "./like-escape.ts";

export async function listRooms(blocks: VnumBlock[]): Promise<RoomListItem[]> {
  if (blocks.length === 0) {
    return [];
  }

  return immortalDb
    .select({ name: room.name, vnum: room.vnum })
    .from(room)
    .where(vnumBlockFilter(blocks))
    .orderBy(room.vnum);
}

export async function getRoom(vnum: number): Promise<null | Room> {
  const [row] = await immortalDb.select().from(room).where(eq(room.vnum, vnum));

  if (!row) {
    return null;
  }

  const [exits, extras] = await Promise.all([
    immortalDb
      .select()
      .from(roomexit)
      .where(eq(roomexit.vnum, vnum))
      .orderBy(roomexit.direction),
    immortalDb.select().from(roomextra).where(eq(roomextra.vnum, vnum)),
  ]);

  const { owner: _owner, ...roomFields } = row;
  return {
    ...roomFields,
    exits: exits.map(({ owner: _exitOwner, ...exitFields }) => exitFields),
    extras: extras.map(
      ({ block: _block, owner: _extraOwner, ...extraFields }) => extraFields,
    ),
  };
}

export async function createRoom(vnum: number, owner: string): Promise<void> {
  // Derive zone from vnum (first zone where top >= vnum), matching C++ redit
  const [matchingZone] = await sneezyDb
    .select({ zone_nr: zone.zone_nr })
    .from(zone)
    .where(gte(zone.top, vnum))
    .orderBy(zone.zone_nr)
    .limit(1);

  await immortalDb.insert(room).values({
    capacity: 0,
    description: "",
    height: -1,
    name: "",
    owner,
    river_dir: 0,
    river_speed: 0,
    room_flag: 1 << 17,
    sector: 60,
    spec: 0,
    telelook: 0,
    teletarg: 0,
    teletime: 0,
    vnum,
    x: 0,
    y: 0,
    z: 0,
    zone: matchingZone?.zone_nr ?? 1,
  });
}

export async function updateRoom(
  vnum: number,
  data: Room,
  owner: string,
  block: number,
): Promise<void> {
  const { exits, extras, vnum: _vnum, ...roomFields } = data;

  await immortalDb.transaction(async (tx) => {
    await tx
      .update(room)
      .set({ ...roomFields, owner })
      .where(eq(room.vnum, vnum));

    // Replace all exits atomically
    await tx.delete(roomexit).where(eq(roomexit.vnum, vnum));

    for (const exit of exits) {
      const { block: _block, vnum: _exitVnum, ...exitFields } = exit;
      await tx.insert(roomexit).values({
        ...exitFields,
        block,
        owner,
        vnum,
      });
    }

    // Replace all extras atomically
    await tx.delete(roomextra).where(eq(roomextra.vnum, vnum));

    for (const extra of extras) {
      const { vnum: _extraVnum, ...extraFields } = extra;
      await tx.insert(roomextra).values({
        ...extraFields,
        block,
        owner,
        vnum,
      });
    }
  });
}

export async function deleteRoom(vnum: number): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx.delete(roomextra).where(eq(roomextra.vnum, vnum));
    await tx.delete(roomexit).where(eq(roomexit.vnum, vnum));
    await tx.delete(room).where(eq(room.vnum, vnum));
  });
}

export async function deleteRooms(vnums: number[]): Promise<number> {
  await immortalDb.transaction(async (tx) => {
    await tx.delete(roomextra).where(inArray(roomextra.vnum, vnums));
    await tx.delete(roomexit).where(inArray(roomexit.vnum, vnums));
    await tx.delete(room).where(inArray(room.vnum, vnums));
  });
  return vnums.length;
}

export async function getRoomName(vnum: number): Promise<null | string> {
  // Try immortal first (builder workspace), then sneezy (production)
  // Exits can point to rooms outside the builder's assigned blocks
  const [immortalRow] = await immortalDb
    .select({ name: room.name })
    .from(room)
    .where(eq(room.vnum, vnum))
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
): Promise<Array<{ name: string; vnum: number }>> {
  // Search both immortal and sneezy since exits can point to any room
  const likeParam = `%${escapeLike(query)}%`;
  const isNumeric = /^\d+$/.test(query);

  const nameFilter = like(room.name, likeParam);
  const sneezyNameFilter = like(sneezyRoom.name, likeParam);

  const [immortalRows, sneezyRows] = await Promise.all([
    immortalDb
      .select({ name: room.name, vnum: room.vnum })
      .from(room)
      .where(
        isNumeric ? or(eq(room.vnum, Number(query)), nameFilter) : nameFilter,
      )
      .orderBy(room.vnum)
      .limit(10),
    sneezyDb
      .select({ name: sneezyRoom.name, vnum: sneezyRoom.vnum })
      .from(sneezyRoom)
      .where(
        isNumeric
          ? or(eq(sneezyRoom.vnum, Number(query)), sneezyNameFilter)
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

export async function roomExists(vnum: number): Promise<boolean> {
  const [row] = await immortalDb
    .select({ vnum: room.vnum })
    .from(room)
    .where(eq(room.vnum, vnum))
    .limit(1);

  return row !== undefined;
}

function vnumBlockFilter(blocks: VnumBlock[]) {
  return or(
    ...blocks.map((b) => and(gte(room.vnum, b.start), lte(room.vnum, b.end))),
  );
}
