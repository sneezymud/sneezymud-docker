import { and, eq, gte, like, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Room, RoomListItem } from "@/shared/schemas/room.ts";

import { immortalDb, sneezyDb } from "../db.ts";
import { room, roomexit } from "../schema/immortal.ts";
import { room as sneezyRoom } from "../schema/sneezy.ts";

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

  const exits = await immortalDb
    .select()
    .from(roomexit)
    .where(eq(roomexit.vnum, vnum))
    .orderBy(roomexit.direction);

  return {
    capacity: row.capacity,
    description: row.description,
    exits: exits.map((e) => ({
      block: e.block,
      condition_flag: e.condition_flag,
      description: e.description,
      destination: e.destination,
      direction: e.direction,
      key_num: e.key_num,
      lock_difficulty: e.lock_difficulty,
      name: e.name,
      type: e.type,
      vnum: e.vnum,
      weight: e.weight,
    })),
    height: row.height,
    name: row.name,
    river_dir: row.river_dir,
    river_speed: row.river_speed,
    room_flag: row.room_flag,
    sector: row.sector,
    spec: row.spec,
    telelook: row.telelook,
    teletarg: row.teletarg,
    teletime: row.teletime,
    vnum: row.vnum,
    x: row.x,
    y: row.y,
    z: row.z,
    zone: row.zone,
  };
}

export async function createRoom(vnum: number, owner: string): Promise<void> {
  await immortalDb.insert(room).values({
    capacity: 0,
    description: "",
    height: 0,
    name: "",
    owner,
    river_dir: 0,
    river_speed: 0,
    room_flag: 0,
    sector: 0,
    spec: 0,
    telelook: 0,
    teletarg: 0,
    teletime: 0,
    vnum,
    x: 0,
    y: 0,
    z: 0,
    zone: 1,
  });
}

export async function updateRoom(
  vnum: number,
  data: Room,
  owner: string,
  block: number,
): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx
      .update(room)
      .set({
        capacity: data.capacity,
        description: data.description,
        height: data.height,
        name: data.name,
        river_dir: data.river_dir,
        river_speed: data.river_speed,
        room_flag: data.room_flag,
        sector: data.sector,
        spec: data.spec,
        telelook: data.telelook,
        teletarg: data.teletarg,
        teletime: data.teletime,
        x: data.x,
        y: data.y,
        z: data.z,
        zone: data.zone,
      })
      .where(eq(room.vnum, vnum));

    // Replace all exits atomically
    await tx.delete(roomexit).where(eq(roomexit.vnum, vnum));

    for (const exit of data.exits) {
      await tx.insert(roomexit).values({
        block,
        condition_flag: exit.condition_flag,
        description: exit.description,
        destination: exit.destination,
        direction: exit.direction,
        key_num: exit.key_num,
        lock_difficulty: exit.lock_difficulty,
        name: exit.name,
        owner,
        type: exit.type,
        vnum,
        weight: exit.weight,
      });
    }
  });
}

export async function deleteRoom(vnum: number): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx.delete(roomexit).where(eq(roomexit.vnum, vnum));
    await tx.delete(room).where(eq(room.vnum, vnum));
  });
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
  const likeParam = `%${query}%`;
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
