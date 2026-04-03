import { inArray } from "drizzle-orm";

import { immortalDb, sneezyDb } from "../db.ts";
import {
  mob as immMob,
  obj as immObj,
  room as immRoom,
} from "../schema/immortal.ts";
import {
  mob as snzMob,
  obj as snzObj,
  room as snzRoom,
} from "../schema/sneezy.ts";
import { ownerEq, type OwnerScope } from "./owner-scope.ts";

export interface DashboardEntity {
  name: string;
  playerId: number;
  status: "modified" | "new";
  type: "mob" | "object" | "room";
  vnum: number;
}

export async function getDashboardEntities(
  scope: OwnerScope,
): Promise<DashboardEntity[]> {
  // Fetch all vnums + names + player_ids from immortal in parallel
  const [immRooms, immMobs, immObjs] = await Promise.all([
    immortalDb
      .select({
        name: immRoom.name,
        player_id: immRoom.player_id,
        vnum: immRoom.vnum,
      })
      .from(immRoom)
      .where(ownerEq(immRoom.player_id, scope)),
    immortalDb
      .select({
        name: immMob.short_desc,
        player_id: immMob.player_id,
        vnum: immMob.vnum,
      })
      .from(immMob)
      .where(ownerEq(immMob.player_id, scope)),
    immortalDb
      .select({
        name: immObj.short_desc,
        player_id: immObj.player_id,
        vnum: immObj.vnum,
      })
      .from(immObj)
      .where(ownerEq(immObj.player_id, scope)),
  ]);

  // Collect all vnums per type so we can batch-query sneezy
  const roomVnums = immRooms.map((r) => r.vnum);
  const mobVnums = immMobs.map((m) => m.vnum);
  const objVnums = immObjs.map((o) => o.vnum);

  // Fetch matching production vnums (just the vnum column for existence check)
  const [snzRoomVnums, snzMobVnums, snzObjVnums] = await Promise.all([
    roomVnums.length > 0
      ? sneezyDb
          .select({ vnum: snzRoom.vnum })
          .from(snzRoom)
          .where(inArray(snzRoom.vnum, roomVnums))
      : [],
    mobVnums.length > 0
      ? sneezyDb
          .select({ vnum: snzMob.vnum })
          .from(snzMob)
          .where(inArray(snzMob.vnum, mobVnums))
      : [],
    objVnums.length > 0
      ? sneezyDb
          .select({ vnum: snzObj.vnum })
          .from(snzObj)
          .where(inArray(snzObj.vnum, objVnums))
      : [],
  ]);

  const prodRoomSet = new Set(snzRoomVnums.map((r) => r.vnum));
  const prodMobSet = new Set(snzMobVnums.map((m) => m.vnum));
  const prodObjSet = new Set(snzObjVnums.map((o) => o.vnum));

  // For entities that exist in both, do a field-level comparison to find
  // actually modified ones. Fetch full rows from both DBs.
  const modifiedRooms = await findModifiedRooms(
    roomVnums.filter((v) => prodRoomSet.has(v)),
    scope,
  );
  const modifiedMobs = await findModifiedMobs(
    mobVnums.filter((v) => prodMobSet.has(v)),
    scope,
  );
  const modifiedObjs = await findModifiedObjects(
    objVnums.filter((v) => prodObjSet.has(v)),
    scope,
  );

  const entities: DashboardEntity[] = [];

  for (const r of immRooms) {
    if (!prodRoomSet.has(r.vnum)) {
      entities.push({
        name: r.name || "(unnamed)",
        playerId: r.player_id,
        status: "new",
        type: "room",
        vnum: r.vnum,
      });
    } else if (modifiedRooms.has(r.vnum)) {
      entities.push({
        name: r.name || "(unnamed)",
        playerId: r.player_id,
        status: "modified",
        type: "room",
        vnum: r.vnum,
      });
    }
  }

  for (const m of immMobs) {
    if (!prodMobSet.has(m.vnum)) {
      entities.push({
        name: m.name || "(unnamed)",
        playerId: m.player_id,
        status: "new",
        type: "mob",
        vnum: m.vnum,
      });
    } else if (modifiedMobs.has(m.vnum)) {
      entities.push({
        name: m.name || "(unnamed)",
        playerId: m.player_id,
        status: "modified",
        type: "mob",
        vnum: m.vnum,
      });
    }
  }

  for (const o of immObjs) {
    if (!prodObjSet.has(o.vnum)) {
      entities.push({
        name: o.name || "(unnamed)",
        playerId: o.player_id,
        status: "new",
        type: "object",
        vnum: o.vnum,
      });
    } else if (modifiedObjs.has(o.vnum)) {
      entities.push({
        name: o.name || "(unnamed)",
        playerId: o.player_id,
        status: "modified",
        type: "object",
        vnum: o.vnum,
      });
    }
  }

  entities.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.vnum - b.vnum;
  });

  return entities;
}

// Compare immortal vs sneezy rows field-by-field. Returns the set of vnums
// that differ. We strip owner/meta columns before comparing.

async function findModifiedRooms(
  vnums: number[],
  scope: OwnerScope,
): Promise<Set<number>> {
  if (vnums.length === 0) return new Set();

  const [immRows, snzRows] = await Promise.all([
    immortalDb
      .select()
      .from(immRoom)
      .where(inArray(immRoom.vnum, vnums))
      .then((rows) =>
        rows.filter(
          (r) =>
            scope === "all" ||
            r.player_id === (scope as { playerId: number }).playerId,
        ),
      ),
    sneezyDb.select().from(snzRoom).where(inArray(snzRoom.vnum, vnums)),
  ]);

  const snzMap = new Map(snzRows.map((r) => [r.vnum, r]));
  const modified = new Set<number>();

  for (const immRow of immRows) {
    const snzRow = snzMap.get(immRow.vnum);
    if (!snzRow) continue;

    // Strip immortal-only columns before comparison
    const { block: _b, player_id: _p, ...immFields } = immRow;
    if (JSON.stringify(immFields) !== JSON.stringify(snzRow)) {
      modified.add(immRow.vnum);
    }
  }

  return modified;
}

async function findModifiedMobs(
  vnums: number[],
  scope: OwnerScope,
): Promise<Set<number>> {
  if (vnums.length === 0) return new Set();

  const [immRows, snzRows] = await Promise.all([
    immortalDb
      .select()
      .from(immMob)
      .where(inArray(immMob.vnum, vnums))
      .then((rows) =>
        rows.filter(
          (r) =>
            scope === "all" ||
            r.player_id === (scope as { playerId: number }).playerId,
        ),
      ),
    sneezyDb.select().from(snzMob).where(inArray(snzMob.vnum, vnums)),
  ]);

  const snzMap = new Map(snzRows.map((r) => [r.vnum, r]));
  const modified = new Set<number>();

  for (const immRow of immRows) {
    const snzRow = snzMap.get(immRow.vnum);
    if (!snzRow) continue;

    // Strip immortal-only columns, add derived columns for comparison
    const { player_id: _p, ...immFields } = immRow;
    const letter =
      immFields.local_sound && !immFields.adjacent_sound ? "A" : "L";
    const pos = immFields.def_position;
    const comparable = { ...immFields, letter, pos };
    if (JSON.stringify(comparable) !== JSON.stringify(snzRow)) {
      modified.add(immRow.vnum);
    }
  }

  return modified;
}

async function findModifiedObjects(
  vnums: number[],
  scope: OwnerScope,
): Promise<Set<number>> {
  if (vnums.length === 0) return new Set();

  const [immRows, snzRows] = await Promise.all([
    immortalDb
      .select()
      .from(immObj)
      .where(inArray(immObj.vnum, vnums))
      .then((rows) =>
        rows.filter(
          (r) =>
            scope === "all" ||
            r.player_id === (scope as { playerId: number }).playerId,
        ),
      ),
    sneezyDb.select().from(snzObj).where(inArray(snzObj.vnum, vnums)),
  ]);

  const snzMap = new Map(snzRows.map((r) => [r.vnum, r]));
  const modified = new Set<number>();

  for (const immRow of immRows) {
    const snzRow = snzMap.get(immRow.vnum);
    if (!snzRow) continue;

    const { player_id: _p, ...immFields } = immRow;
    if (JSON.stringify(immFields) !== JSON.stringify(snzRow)) {
      modified.add(immRow.vnum);
    }
  }

  return modified;
}
