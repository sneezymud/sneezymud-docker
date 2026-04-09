import { and, eq, inArray } from "drizzle-orm";

import { immortalDb, sneezyDb } from "../db.ts";
import {
  mob as immMob,
  mobExtra as immMobExtra,
  mobImm as immMobImm,
  mobresponses as immMobresponses,
  obj as immObj,
  objaffect as immObjaffect,
  objextra as immObjextra,
  room as immRoom,
  roomexit as immRoomexit,
  roomextra as immRoomextra,
} from "../schema/immortal.ts";
import {
  mob as snzMob,
  mobExtra as snzMobExtra,
  mobImm as snzMobImm,
  mobresponses as snzMobresponses,
  obj as snzObj,
  objaffect as snzObjaffect,
  objextra as snzObjextra,
  room as snzRoom,
  roomexit as snzRoomexit,
  roomextra as snzRoomextra,
} from "../schema/sneezy.ts";
import { deriveMobLetterAndPos } from "./mob-derived.ts";
import { ownerEq, type OwnerScope } from "./owner-scope.ts";

// ---------------------------------------------------------------------------
// Field name lists for explicit field-by-field comparison.
// vnum is excluded (it's the join key). Owner/meta columns (player_id, block)
// are excluded (immortal-only). Derived columns (letter, pos for mob) are
// handled separately.
// ---------------------------------------------------------------------------

const ROOM_FIELDS = [
  "capacity",
  "description",
  "height",
  "name",
  "river_dir",
  "river_speed",
  "room_flag",
  "sector",
  "spec",
  "telelook",
  "teletarg",
  "teletime",
  "x",
  "y",
  "z",
  "zone",
] as const;

const ROOMEXIT_FIELDS = [
  "condition_flag",
  "description",
  "destination",
  "key_num",
  "lock_difficulty",
  "name",
  "type",
  "weight",
] as const;

const ROOMEXTRA_FIELDS = ["description"] as const;

const MOB_FIELDS = [
  "ac",
  "actions",
  "adjacent_sound",
  "affects",
  "agi",
  "attacks",
  "bra",
  "can_be_seen",
  "cha",
  "class",
  "con",
  "damage_level",
  "damage_precision",
  "def_position",
  "description",
  "dex",
  "fact_perc",
  "faction",
  "foc",
  "gold",
  "height",
  "hpbonus",
  "intel",
  "kar",
  "letter",
  "level",
  "local_sound",
  "long_desc",
  "max_exist",
  "name",
  "per",
  "pos",
  "race",
  "sex",
  "short_desc",
  "skin",
  "spe",
  "spec_proc",
  "str",
  "tohit",
  "vision",
  "weight",
  "wis",
] as const;

const MOBEXTRA_FIELDS = ["description"] as const;

const MOBIMM_FIELDS = ["amt"] as const;

const OBJ_FIELDS = [
  "action_desc",
  "action_flag",
  "can_be_seen",
  "cur_struct",
  "decay",
  "long_desc",
  "material",
  "max_exist",
  "max_struct",
  "name",
  "price",
  "short_desc",
  "spec_proc",
  "type",
  "val0",
  "val1",
  "val2",
  "val3",
  "volume",
  "wear_flag",
  "weight",
] as const;

const OBJEXTRA_FIELDS = ["description"] as const;

const MOB_RESPONSE_FIELDS = ["response"] as const;

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

export interface DashboardEntity {
  name: string;
  playerId: number;
  status: "modified" | "new";
  type: "mob" | "mob-response" | "object" | "room";
  vnum: number;
}

export async function getDashboardEntities(
  scope: OwnerScope,
): Promise<DashboardEntity[]> {
  // Fetch all vnums + names + player_ids from immortal in parallel.
  // Mob responses join to immMob for the display name.
  const [immRooms, immMobs, immObjs, immMobResps] = await Promise.all([
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
    immortalDb
      .select({
        name: immMob.short_desc,
        player_id: immMobresponses.player_id,
        vnum: immMobresponses.vnum,
      })
      .from(immMobresponses)
      .leftJoin(
        immMob,
        and(
          eq(immMobresponses.vnum, immMob.vnum),
          eq(immMobresponses.player_id, immMob.player_id),
        ),
      )
      .where(ownerEq(immMobresponses.player_id, scope)),
  ]);

  // Collect all vnums per type so we can batch-query sneezy
  const roomVnums = immRooms.map((r) => r.vnum);
  const mobVnums = immMobs.map((m) => m.vnum);
  const objVnums = immObjs.map((o) => o.vnum);
  const mobRespVnums = immMobResps.map((r) => r.vnum);

  // Fetch matching production vnums (just the vnum column for existence check)
  const [snzRoomVnums, snzMobVnums, snzObjVnums, snzMobRespVnums] =
    await Promise.all([
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
      mobRespVnums.length > 0
        ? sneezyDb
            .select({ vnum: snzMobresponses.vnum })
            .from(snzMobresponses)
            .where(inArray(snzMobresponses.vnum, mobRespVnums))
        : [],
    ]);

  const prodRoomSet = new Set(snzRoomVnums.map((r) => r.vnum));
  const prodMobSet = new Set(snzMobVnums.map((m) => m.vnum));
  const prodObjSet = new Set(snzObjVnums.map((o) => o.vnum));
  const prodMobRespSet = new Set(snzMobRespVnums.map((r) => r.vnum));

  // For entities that exist in both, do a field-level comparison to find
  // actually modified ones. Fetch full rows from both DBs.
  const roomPairs = immRooms
    .filter((r) => prodRoomSet.has(r.vnum))
    .map((r) => ({ player_id: r.player_id, vnum: r.vnum }));
  const mobPairs = immMobs
    .filter((m) => prodMobSet.has(m.vnum))
    .map((m) => ({ player_id: m.player_id, vnum: m.vnum }));
  const objPairs = immObjs
    .filter((o) => prodObjSet.has(o.vnum))
    .map((o) => ({ player_id: o.player_id, vnum: o.vnum }));
  const mobRespPairs = immMobResps
    .filter((r) => prodMobRespSet.has(r.vnum))
    .map((r) => ({ player_id: r.player_id, vnum: r.vnum }));

  const [modifiedRooms, modifiedMobs, modifiedObjs, modifiedMobResps] =
    await Promise.all([
      findModifiedRooms(roomPairs, scope),
      findModifiedMobs(mobPairs, scope),
      findModifiedObjects(objPairs, scope),
      findModifiedMobResponses(mobRespPairs, scope),
    ]);

  const entities: DashboardEntity[] = [];

  for (const r of immRooms) {
    const key = `${r.player_id}:${r.vnum}`;
    if (!prodRoomSet.has(r.vnum)) {
      entities.push({
        name: r.name || "(unnamed)",
        playerId: r.player_id,
        status: "new",
        type: "room",
        vnum: r.vnum,
      });
    } else if (modifiedRooms.has(key)) {
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
    const key = `${m.player_id}:${m.vnum}`;
    if (!prodMobSet.has(m.vnum)) {
      entities.push({
        name: m.name || "(unnamed)",
        playerId: m.player_id,
        status: "new",
        type: "mob",
        vnum: m.vnum,
      });
    } else if (modifiedMobs.has(key)) {
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
    const key = `${o.player_id}:${o.vnum}`;
    if (!prodObjSet.has(o.vnum)) {
      entities.push({
        name: o.name || "(unnamed)",
        playerId: o.player_id,
        status: "new",
        type: "object",
        vnum: o.vnum,
      });
    } else if (modifiedObjs.has(key)) {
      entities.push({
        name: o.name || "(unnamed)",
        playerId: o.player_id,
        status: "modified",
        type: "object",
        vnum: o.vnum,
      });
    }
  }

  for (const r of immMobResps) {
    const key = `${r.player_id}:${r.vnum}`;
    const name = r.name ?? "(unnamed)";
    if (!prodMobRespSet.has(r.vnum)) {
      entities.push({
        name,
        playerId: r.player_id,
        status: "new",
        type: "mob-response",
        vnum: r.vnum,
      });
    } else if (modifiedMobResps.has(key)) {
      entities.push({
        name,
        playerId: r.player_id,
        status: "modified",
        type: "mob-response",
        vnum: r.vnum,
      });
    }
  }

  entities.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.vnum - b.vnum;
  });

  return entities;
}

// ---------------------------------------------------------------------------
// Public types and API
// ---------------------------------------------------------------------------

/**
 * Normalizes nullable text values so that null and "" compare as equal.
 * The C++ game server treats these interchangeably, so a round-trip through
 * publish can flip one to the other without a meaningful content change.
 */
function normalizeNullable(val: unknown): unknown {
  if (val === null || val === undefined || val === "") return null;
  return val;
}

/**
 * Compares two rows field-by-field over an explicit list of keys.
 * Uses null-normalizing equality to handle null vs undefined and null vs ""
 * discrepancies that can arise from DB driver differences between the two
 * pools or from the game server treating null and "" interchangeably.
 */
function fieldsEqual<T extends Record<string, unknown>>(
  a: T,
  b: T,
  fields: ReadonlyArray<keyof T & string>,
): boolean {
  for (const f of fields) {
    // weight uses epsilon because DOUBLE(6,2) storage round-trips with float-precision noise
    if (f === "weight") {
      const aNum = Number(a[f]);
      const bNum = Number(b[f]);
      if (Math.abs(aNum - bNum) > 1e-9) return false;
      continue;
    }
    if (normalizeNullable(a[f]) !== normalizeNullable(b[f])) return false;
  }
  return true;
}

/**
 * Compares two child row sets. Rows are matched by a string key derived from
 * keyFn. Returns true only if both sets have the same keys and all matched
 * pairs are field-equal.
 */
function childrenEqual<T extends Record<string, unknown>>(
  immRows: T[],
  snzRows: T[],
  keyFn: (row: T) => string,
  fields: ReadonlyArray<keyof T & string>,
): boolean {
  if (immRows.length !== snzRows.length) return false;
  const snzMap = new Map(snzRows.map((r) => [keyFn(r), r]));
  for (const immRow of immRows) {
    const snzRow = snzMap.get(keyFn(immRow));
    if (!snzRow) return false;
    if (!fieldsEqual(immRow, snzRow, fields)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Per-type modified detection
// ---------------------------------------------------------------------------

function groupByVnum<T extends { vnum: number }>(rows: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const existing = map.get(row.vnum);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.vnum, [row]);
    }
  }
  return map;
}

function groupByVnumAndPlayer<T extends { player_id: number; vnum: number }>(
  rows: T[],
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const key = `${row.player_id}:${row.vnum}`;
    const bucket = out.get(key);
    if (bucket) bucket.push(row);
    else out.set(key, [row]);
  }
  return out;
}

async function findModifiedRooms(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set();

  const vnums = pairs.map((p) => p.vnum);

  const [immParents, snzParents, immExits, snzExits, immExtras, snzExtras] =
    await Promise.all([
      immortalDb
        .select()
        .from(immRoom)
        .where(
          and(inArray(immRoom.vnum, vnums), ownerEq(immRoom.player_id, scope)),
        ),
      sneezyDb.select().from(snzRoom).where(inArray(snzRoom.vnum, vnums)),
      immortalDb
        .select()
        .from(immRoomexit)
        .where(
          and(
            inArray(immRoomexit.vnum, vnums),
            ownerEq(immRoomexit.player_id, scope),
          ),
        ),
      sneezyDb
        .select()
        .from(snzRoomexit)
        .where(inArray(snzRoomexit.vnum, vnums)),
      immortalDb
        .select()
        .from(immRoomextra)
        .where(
          and(
            inArray(immRoomextra.vnum, vnums),
            ownerEq(immRoomextra.player_id, scope),
          ),
        ),
      sneezyDb
        .select()
        .from(snzRoomextra)
        .where(inArray(snzRoomextra.vnum, vnums)),
    ]);

  const snzParentMap = new Map(snzParents.map((r) => [r.vnum, r]));

  // Group immortal child rows by (player_id, vnum), sneezy by vnum only
  const immExitsByKey = groupByVnumAndPlayer(immExits);
  const snzExitsByVnum = groupByVnum(snzExits);
  const immExtrasByKey = groupByVnumAndPlayer(immExtras);
  const snzExtrasByVnum = groupByVnum(snzExtras);

  const modified = new Set<string>();

  for (const immRow of immParents) {
    const key = `${immRow.player_id}:${immRow.vnum}`;
    const snzRow = snzParentMap.get(immRow.vnum);
    if (!snzRow) continue;

    if (!fieldsEqual(immRow, snzRow, ROOM_FIELDS)) {
      modified.add(key);
      continue;
    }

    const immExitsForKey = immExitsByKey.get(key) ?? [];
    const snzExitsForVnum = snzExitsByVnum.get(immRow.vnum) ?? [];
    if (
      !childrenEqual(
        immExitsForKey,
        snzExitsForVnum,
        (r) => String(r.direction),
        ROOMEXIT_FIELDS,
      )
    ) {
      modified.add(key);
      continue;
    }

    const immExtrasForKey = immExtrasByKey.get(key) ?? [];
    const snzExtrasForVnum = snzExtrasByVnum.get(immRow.vnum) ?? [];
    if (
      !childrenEqual(
        immExtrasForKey,
        snzExtrasForVnum,
        (r) => r.name,
        ROOMEXTRA_FIELDS,
      )
    ) {
      modified.add(key);
    }
  }

  return modified;
}

async function findModifiedMobs(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set();

  const vnums = pairs.map((p) => p.vnum);

  const [immParents, snzParents, immExtras, snzExtras, immImms, snzImms] =
    await Promise.all([
      immortalDb
        .select()
        .from(immMob)
        .where(
          and(inArray(immMob.vnum, vnums), ownerEq(immMob.player_id, scope)),
        ),
      sneezyDb.select().from(snzMob).where(inArray(snzMob.vnum, vnums)),
      immortalDb
        .select()
        .from(immMobExtra)
        .where(
          and(
            inArray(immMobExtra.vnum, vnums),
            ownerEq(immMobExtra.player_id, scope),
          ),
        ),
      sneezyDb
        .select()
        .from(snzMobExtra)
        .where(inArray(snzMobExtra.vnum, vnums)),
      immortalDb
        .select()
        .from(immMobImm)
        .where(
          and(
            inArray(immMobImm.vnum, vnums),
            ownerEq(immMobImm.player_id, scope),
          ),
        ),
      sneezyDb.select().from(snzMobImm).where(inArray(snzMobImm.vnum, vnums)),
    ]);

  const snzParentMap = new Map(snzParents.map((r) => [r.vnum, r]));

  const immExtrasByKey = groupByVnumAndPlayer(immExtras);
  const snzExtrasByVnum = groupByVnum(snzExtras);
  const immImmsByKey = groupByVnumAndPlayer(immImms);
  const snzImmsByVnum = groupByVnum(snzImms);

  const modified = new Set<string>();

  for (const immRow of immParents) {
    const key = `${immRow.player_id}:${immRow.vnum}`;
    const snzRow = snzParentMap.get(immRow.vnum);
    if (!snzRow) continue;

    // Derive letter and pos the same way publishMobTx does, then overlay them
    // on the immortal row before comparing against the sneezy row.
    const immComparable = { ...immRow, ...deriveMobLetterAndPos(immRow) };

    if (!fieldsEqual(immComparable, snzRow, MOB_FIELDS)) {
      modified.add(key);
      continue;
    }

    const immExtrasForKey = immExtrasByKey.get(key) ?? [];
    const snzExtrasForVnum = snzExtrasByVnum.get(immRow.vnum) ?? [];
    if (
      !childrenEqual(
        immExtrasForKey,
        snzExtrasForVnum,
        (r) => r.keyword,
        MOBEXTRA_FIELDS,
      )
    ) {
      modified.add(key);
      continue;
    }

    const immImmsForKey = immImmsByKey.get(key) ?? [];
    const snzImmsForVnum = snzImmsByVnum.get(immRow.vnum) ?? [];
    if (
      !childrenEqual(
        immImmsForKey,
        snzImmsForVnum,
        (r) => String(r.type),
        MOBIMM_FIELDS,
      )
    ) {
      modified.add(key);
    }
  }

  return modified;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

async function findModifiedObjects(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set();

  const vnums = pairs.map((p) => p.vnum);

  const [immParents, snzParents, immAffects, snzAffects, immExtras, snzExtras] =
    await Promise.all([
      immortalDb
        .select()
        .from(immObj)
        .where(
          and(inArray(immObj.vnum, vnums), ownerEq(immObj.player_id, scope)),
        ),
      sneezyDb.select().from(snzObj).where(inArray(snzObj.vnum, vnums)),
      immortalDb
        .select()
        .from(immObjaffect)
        .where(
          and(
            inArray(immObjaffect.vnum, vnums),
            ownerEq(immObjaffect.player_id, scope),
          ),
        ),
      sneezyDb
        .select()
        .from(snzObjaffect)
        .where(inArray(snzObjaffect.vnum, vnums)),
      immortalDb
        .select()
        .from(immObjextra)
        .where(
          and(
            inArray(immObjextra.vnum, vnums),
            ownerEq(immObjextra.player_id, scope),
          ),
        ),
      sneezyDb
        .select()
        .from(snzObjextra)
        .where(inArray(snzObjextra.vnum, vnums)),
    ]);

  const snzParentMap = new Map(snzParents.map((r) => [r.vnum, r]));

  const immAffectsByKey = groupByVnumAndPlayer(immAffects);
  const snzAffectsByVnum = groupByVnum(snzAffects);
  const immExtrasByKey = groupByVnumAndPlayer(immExtras);
  const snzExtrasByVnum = groupByVnum(snzExtras);

  const modified = new Set<string>();

  for (const immRow of immParents) {
    const key = `${immRow.player_id}:${immRow.vnum}`;
    const snzRow = snzParentMap.get(immRow.vnum);
    if (!snzRow) continue;

    if (!fieldsEqual(immRow, snzRow, OBJ_FIELDS)) {
      modified.add(key);
      continue;
    }

    // objaffect: the composite key (type, mod1, mod2) IS the entire content
    // (excluding owner/vnum), so use the key as both identity and comparison.
    const immAffectsForKey = immAffectsByKey.get(key) ?? [];
    const snzAffectsForVnum = snzAffectsByVnum.get(immRow.vnum) ?? [];
    if (
      !childrenEqual(
        immAffectsForKey,
        snzAffectsForVnum,
        (r) => `${r.type}|${r.mod1}|${r.mod2}`,
        [],
      )
    ) {
      modified.add(key);
      continue;
    }

    const immExtrasForKey = immExtrasByKey.get(key) ?? [];
    const snzExtrasForVnum = snzExtrasByVnum.get(immRow.vnum) ?? [];
    if (
      !childrenEqual(
        immExtrasForKey,
        snzExtrasForVnum,
        (r) => r.name,
        OBJEXTRA_FIELDS,
      )
    ) {
      modified.add(key);
    }
  }

  return modified;
}

async function findModifiedMobResponses(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set();

  const vnums = pairs.map((p) => p.vnum);

  const [immRows, snzRows] = await Promise.all([
    immortalDb
      .select()
      .from(immMobresponses)
      .where(
        and(
          inArray(immMobresponses.vnum, vnums),
          ownerEq(immMobresponses.player_id, scope),
        ),
      ),
    sneezyDb
      .select()
      .from(snzMobresponses)
      .where(inArray(snzMobresponses.vnum, vnums)),
  ]);

  const snzMap = new Map(snzRows.map((r) => [r.vnum, r]));

  const modified = new Set<string>();

  for (const immRow of immRows) {
    const key = `${immRow.player_id}:${immRow.vnum}`;
    const snzRow = snzMap.get(immRow.vnum);
    if (!snzRow) continue;

    if (!fieldsEqual(immRow, snzRow, MOB_RESPONSE_FIELDS)) {
      modified.add(key);
    }
  }

  return modified;
}
