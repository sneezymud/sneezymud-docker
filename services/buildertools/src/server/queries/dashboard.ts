import type { MySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";

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

// vnum is excluded (it's the join key). Owner/meta columns (player_id, block)
// are excluded (immortal-only). Derived columns (letter, pos for mob) are
// handled separately.
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

interface DashboardEntity {
  name: string;
  playerId: number;
  status: "modified" | "new";
  type: "mob" | "mob-response" | "object" | "room";
  vnum: number;
}

export async function getDashboardEntities(scope: OwnerScope) {
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

  const [prodRoomSet, prodMobSet, prodObjSet, prodMobRespSet] =
    await Promise.all([
      getProdVnumSet({
        immRows: immRooms,
        snzTable: snzRoom,
        snzVnumColumn: snzRoom.vnum,
      }),
      getProdVnumSet({
        immRows: immMobs,
        snzTable: snzMob,
        snzVnumColumn: snzMob.vnum,
      }),
      getProdVnumSet({
        immRows: immObjs,
        snzTable: snzObj,
        snzVnumColumn: snzObj.vnum,
      }),
      getProdVnumSet({
        immRows: immMobResps,
        snzTable: snzMobresponses,
        snzVnumColumn: snzMobresponses.vnum,
      }),
    ]);

  const roomPairs = pickExistingPairs(immRooms, prodRoomSet);
  const mobPairs = pickExistingPairs(immMobs, prodMobSet);
  const objPairs = pickExistingPairs(immObjs, prodObjSet);
  const mobRespPairs = pickExistingPairs(immMobResps, prodMobRespSet);

  const [modifiedRooms, modifiedMobs, modifiedObjs, modifiedMobResps] =
    await Promise.all([
      findModifiedRooms(roomPairs, scope),
      findModifiedMobs(mobPairs, scope),
      findModifiedObjects(objPairs, scope),
      findModifiedMobResponses(mobRespPairs, scope),
    ]);

  const entities: DashboardEntity[] = [
    ...buildEntities({
      modifiedSet: modifiedRooms,
      prodSet: prodRoomSet,
      rows: immRooms,
      type: "room",
    }),
    ...buildEntities({
      modifiedSet: modifiedMobs,
      prodSet: prodMobSet,
      rows: immMobs,
      type: "mob",
    }),
    ...buildEntities({
      modifiedSet: modifiedObjs,
      prodSet: prodObjSet,
      rows: immObjs,
      type: "object",
    }),
    ...buildEntities({
      modifiedSet: modifiedMobResps,
      prodSet: prodMobRespSet,
      rows: immMobResps,
      type: "mob-response",
    }),
  ];

  entities.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.vnum - b.vnum;
  });

  return entities;
}

function pickExistingPairs(
  immRows: ReadonlyArray<{ player_id: number; vnum: number }>,
  prodSet: Set<number>,
) {
  return immRows.flatMap(({ player_id, vnum }) =>
    prodSet.has(vnum) ? [{ player_id, vnum }] : [],
  );
}

async function getProdVnumSet({
  immRows,
  snzTable,
  snzVnumColumn,
}: {
  immRows: ReadonlyArray<{ vnum: number }>;
  snzTable: MySqlTable;
  snzVnumColumn: MySqlColumn & { _: { data: number; notNull: true } };
}) {
  const vnums = immRows.map((r) => r.vnum);
  if (vnums.length === 0) return new Set<number>();
  const result = await sneezyDb
    .select({ vnum: snzVnumColumn })
    .from(snzTable)
    .where(inArray(snzVnumColumn, vnums));
  return new Set(result.map((r) => r.vnum));
}

function buildEntities({
  modifiedSet,
  prodSet,
  rows,
  type,
}: {
  modifiedSet: Set<string>;
  prodSet: Set<number>;
  rows: ReadonlyArray<{ name: null | string; player_id: number; vnum: number }>;
  type: DashboardEntity["type"];
}): DashboardEntity[] {
  return rows.flatMap(({ name, player_id, vnum }) => {
    const status = prodSet.has(vnum)
      ? modifiedSet.has(`${player_id}:${vnum}`)
        ? "modified"
        : null
      : "new";
    if (status === null) return [];
    // Treat null (LEFT JOIN miss) and empty string both as "no name" so
    // the dashboard never renders a blank label. The inner `??` strips
    // nullishness so the outer `||` checks only for empty string.
    return [
      {
        name: (name ?? "") || "(unnamed)",
        playerId: player_id,
        status,
        type,
        vnum,
      },
    ];
  });
}

/**
 * Normalizes nullable text values so that null and "" compare as equal.
 * The C++ game server treats these interchangeably, so a round-trip through
 * publish can flip one to the other without a meaningful content change.
 */
function normalizeNullable(val: unknown) {
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
) {
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
function childrenEqual<T extends Record<string, unknown>>({
  fields,
  immRows,
  keyFn,
  snzRows,
}: {
  fields: ReadonlyArray<keyof T & string>;
  immRows: T[];
  keyFn: (row: T) => string;
  snzRows: T[];
}) {
  if (immRows.length !== snzRows.length) return false;
  const snzMap = new Map(snzRows.map((r) => [keyFn(r), r]));
  for (const immRow of immRows) {
    const snzRow = snzMap.get(keyFn(immRow));
    if (!snzRow) return false;
    if (!fieldsEqual(immRow, snzRow, fields)) return false;
  }
  return true;
}

function groupByVnum<T extends { vnum: number }>(rows: T[]) {
  return Map.groupBy(rows, (r) => r.vnum);
}

function groupByVnumAndPlayer<T extends { player_id: number; vnum: number }>(
  rows: T[],
) {
  return Map.groupBy(rows, ({ player_id, vnum }) => `${player_id}:${vnum}`);
}

async function findModifiedRooms(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
) {
  if (pairs.length === 0) return new Set<string>();

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
    const { player_id, vnum } = immRow;
    const key = `${player_id}:${vnum}`;
    const snzRow = snzParentMap.get(vnum);
    if (!snzRow) continue;

    if (!fieldsEqual(immRow, snzRow, ROOM_FIELDS)) {
      modified.add(key);
      continue;
    }

    const immExitsForKey = immExitsByKey.get(key) ?? [];
    const snzExitsForVnum = snzExitsByVnum.get(vnum) ?? [];
    if (
      !childrenEqual({
        fields: ROOMEXIT_FIELDS,
        immRows: immExitsForKey,
        keyFn: (r) => String(r.direction),
        snzRows: snzExitsForVnum,
      })
    ) {
      modified.add(key);
      continue;
    }

    const immExtrasForKey = immExtrasByKey.get(key) ?? [];
    const snzExtrasForVnum = snzExtrasByVnum.get(vnum) ?? [];
    if (
      !childrenEqual({
        fields: ROOMEXTRA_FIELDS,
        immRows: immExtrasForKey,
        keyFn: (r) => r.name,
        snzRows: snzExtrasForVnum,
      })
    ) {
      modified.add(key);
    }
  }

  return modified;
}

async function findModifiedMobs(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
) {
  if (pairs.length === 0) return new Set<string>();

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
    const { player_id, vnum } = immRow;
    const key = `${player_id}:${vnum}`;
    const snzRow = snzParentMap.get(vnum);
    if (!snzRow) continue;

    // Derive letter and pos the same way publishMobTx does, then overlay them
    // on the immortal row before comparing against the sneezy row.
    const immComparable = { ...immRow, ...deriveMobLetterAndPos(immRow) };

    if (!fieldsEqual(immComparable, snzRow, MOB_FIELDS)) {
      modified.add(key);
      continue;
    }

    const immExtrasForKey = immExtrasByKey.get(key) ?? [];
    const snzExtrasForVnum = snzExtrasByVnum.get(vnum) ?? [];
    if (
      !childrenEqual({
        fields: MOBEXTRA_FIELDS,
        immRows: immExtrasForKey,
        keyFn: (r) => r.keyword,
        snzRows: snzExtrasForVnum,
      })
    ) {
      modified.add(key);
      continue;
    }

    const immImmsForKey = immImmsByKey.get(key) ?? [];
    const snzImmsForVnum = snzImmsByVnum.get(vnum) ?? [];
    if (
      !childrenEqual({
        fields: MOBIMM_FIELDS,
        immRows: immImmsForKey,
        keyFn: (r) => String(r.type),
        snzRows: snzImmsForVnum,
      })
    ) {
      modified.add(key);
    }
  }

  return modified;
}

async function findModifiedObjects(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
) {
  if (pairs.length === 0) return new Set<string>();

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
    const { player_id, vnum } = immRow;
    const key = `${player_id}:${vnum}`;
    const snzRow = snzParentMap.get(vnum);
    if (!snzRow) continue;

    if (!fieldsEqual(immRow, snzRow, OBJ_FIELDS)) {
      modified.add(key);
      continue;
    }

    // objaffect: the composite key (type, mod1, mod2) IS the entire content
    // (excluding owner/vnum), so use the key as both identity and comparison.
    const immAffectsForKey = immAffectsByKey.get(key) ?? [];
    const snzAffectsForVnum = snzAffectsByVnum.get(vnum) ?? [];
    if (
      !childrenEqual({
        fields: [],
        immRows: immAffectsForKey,
        keyFn: ({ mod1, mod2, type }) => `${type}|${mod1}|${mod2}`,
        snzRows: snzAffectsForVnum,
      })
    ) {
      modified.add(key);
      continue;
    }

    const immExtrasForKey = immExtrasByKey.get(key) ?? [];
    const snzExtrasForVnum = snzExtrasByVnum.get(vnum) ?? [];
    if (
      !childrenEqual({
        fields: OBJEXTRA_FIELDS,
        immRows: immExtrasForKey,
        keyFn: (r) => r.name,
        snzRows: snzExtrasForVnum,
      })
    ) {
      modified.add(key);
    }
  }

  return modified;
}

async function findModifiedMobResponses(
  pairs: Array<{ player_id: number; vnum: number }>,
  scope: OwnerScope,
) {
  if (pairs.length === 0) return new Set<string>();

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
    const { player_id, vnum } = immRow;
    const key = `${player_id}:${vnum}`;
    const snzRow = snzMap.get(vnum);
    if (!snzRow) continue;

    if (!fieldsEqual(immRow, snzRow, MOB_RESPONSE_FIELDS)) {
      modified.add(key);
    }
  }

  return modified;
}
