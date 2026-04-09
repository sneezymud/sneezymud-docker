import { and, eq } from "drizzle-orm";

import type { MobResponse } from "@/shared/schemas/mob-response.ts";
import type { Mob } from "@/shared/schemas/mob.ts";
import type { Obj } from "@/shared/schemas/obj.ts";
import type { Room } from "@/shared/schemas/room.ts";

import { mobExtraSchema } from "@/shared/schemas/mob.ts";

import { immortalDb, sneezyDb } from "../db.ts";
import {
  mob as immMob,
  obj as immObj,
  room as immRoom,
} from "../schema/immortal.ts";
import {
  mob,
  mobExtra,
  mobImm,
  mobresponses,
  obj,
  objaffect,
  objextra,
  room,
  roomexit,
  roomextra,
} from "../schema/sneezy.ts";
import { deriveMobLetterAndPos } from "./mob-derived.ts";
import { getMobResponse } from "./mob-responses.ts";
import { getMob } from "./mobs.ts";
import { getObject } from "./objects.ts";
import { ownerEq, type OwnerScope } from "./owner-scope.ts";
import { getRoom } from "./rooms.ts";

// Drizzle transaction type - inferred from sneezyDb.transaction callback
type SneezyTx = Parameters<Parameters<typeof sneezyDb.transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Read helpers - fetch from sneezy (production) DB
// ---------------------------------------------------------------------------

/**
 * Thrown by publish helpers when the requested entity does not exist in
 * immortal. Routes catch this and return 404 instead of letting it propagate
 * as a generic 500.
 */
export class EntityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntityNotFoundError";
  }
}

export class MobResponseMissingParentError extends Error {
  vnum: number;

  constructor(vnum: number) {
    super(
      `Cannot publish mob response: parent mob ${vnum} does not exist in production. ` +
        `Publish the mob first.`,
    );
    this.name = "MobResponseMissingParentError";
    this.vnum = vnum;
  }
}

export async function getSneezyRoom(vnum: number): Promise<null | Room> {
  const [row] = await sneezyDb.select().from(room).where(eq(room.vnum, vnum));

  if (!row) {
    return null;
  }

  const [exits, extras] = await Promise.all([
    sneezyDb
      .select()
      .from(roomexit)
      .where(eq(roomexit.vnum, vnum))
      .orderBy(roomexit.direction),
    sneezyDb.select().from(roomextra).where(eq(roomextra.vnum, vnum)),
  ]);

  return {
    ...row,
    exits: exits.map((exit) => ({ ...exit, block: null })),
    extras,
  };
}

export async function getSneezyMob(vnum: number): Promise<Mob | null> {
  const [row] = await sneezyDb.select().from(mob).where(eq(mob.vnum, vnum));

  if (!row) {
    return null;
  }

  const [extras, immunities] = await Promise.all([
    sneezyDb.select().from(mobExtra).where(eq(mobExtra.vnum, vnum)),
    sneezyDb.select().from(mobImm).where(eq(mobImm.vnum, vnum)),
  ]);

  const { letter: _letter, pos: _pos, ...mobFields } = row;
  return {
    ...mobFields,
    adjacent_sound: mobFields.adjacent_sound ?? "",
    extras: extras.map(({ description, ...fields }) =>
      mobExtraSchema.parse({ ...fields, description: description ?? "" }),
    ),
    immunities: immunities.map(({ amt, ...fields }) => ({
      ...fields,
      amt: amt ?? 0,
    })),
    local_sound: mobFields.local_sound ?? "",
  };
}

export async function getSneezyObject(vnum: number): Promise<null | Obj> {
  const [row] = await sneezyDb.select().from(obj).where(eq(obj.vnum, vnum));

  if (!row) {
    return null;
  }

  const [affects, extras] = await Promise.all([
    sneezyDb.select().from(objaffect).where(eq(objaffect.vnum, vnum)),
    sneezyDb.select().from(objextra).where(eq(objextra.vnum, vnum)),
  ]);

  return { ...row, affects, extras };
}

export async function getSneezyMobResponse(
  vnum: number,
): Promise<MobResponse | null> {
  const [row] = await sneezyDb
    .select({ response: mobresponses.response, vnum: mobresponses.vnum })
    .from(mobresponses)
    .where(eq(mobresponses.vnum, vnum));

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Publish helpers - copy from immortal to sneezy (delete-then-insert)
// ---------------------------------------------------------------------------

export async function publishRoom(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await lockImmortalParent("room", vnum, scope);
  await sneezyDb.transaction((tx) => publishRoomTx(vnum, scope, tx));
}

export async function publishMob(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await lockImmortalParent("mob", vnum, scope);
  await sneezyDb.transaction((tx) => publishMobTx(vnum, scope, tx));
}

export async function publishObject(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await lockImmortalParent("object", vnum, scope);
  await sneezyDb.transaction((tx) => publishObjectTx(vnum, scope, tx));
}

export async function publishMobResponse(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await lockImmortalParent("mob-response", vnum, scope);
  await sneezyDb.transaction((tx) => publishMobResponseTx(vnum, scope, tx));
}

/**
 * Acquire a short-lived `SELECT ... FOR UPDATE` lock on the immortal
 * parent row before entering the sneezy publish transaction.
 *
 * This is a best-effort lock (B-M4): it is released as soon as the
 * immortal transaction commits (before the sneezy write begins), leaving
 * a small residual race window. Tracked as a followup in
 * upgrade-roadmap.md: full transaction-aware read helpers would eliminate
 * the window but require a larger refactor.
 *
 * Throws `EntityNotFoundError` if the row does not exist in immortal.
 */
async function lockImmortalParent(
  type: "mob" | "mob-response" | "object" | "room",
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    if (type === "room") {
      const [row] = await tx
        .select({ vnum: immRoom.vnum })
        .from(immRoom)
        .where(and(eq(immRoom.vnum, vnum), ownerEq(immRoom.player_id, scope)))
        .for("update");
      if (!row) {
        throw new EntityNotFoundError(`Room ${vnum} not found in immortal DB`);
      }
    } else if (type === "mob" || type === "mob-response") {
      // Mob responses lock the parent mob row, not the response row - the
      // response's composite key includes the mob's vnum, so locking the
      // mob is the authoritative parent lock for both.
      const [row] = await tx
        .select({ vnum: immMob.vnum })
        .from(immMob)
        .where(and(eq(immMob.vnum, vnum), ownerEq(immMob.player_id, scope)))
        .for("update");
      if (!row) {
        const label = type === "mob" ? "Mob" : "Mob response";
        throw new EntityNotFoundError(
          `${label} ${vnum} not found in immortal DB`,
        );
      }
    } else {
      const [row] = await tx
        .select({ vnum: immObj.vnum })
        .from(immObj)
        .where(and(eq(immObj.vnum, vnum), ownerEq(immObj.player_id, scope)))
        .for("update");
      if (!row) {
        throw new EntityNotFoundError(
          `Object ${vnum} not found in immortal DB`,
        );
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Public publish API
// ---------------------------------------------------------------------------

async function publishRoomTx(
  vnum: number,
  scope: OwnerScope,
  tx: SneezyTx,
): Promise<void> {
  const data = await getRoom(vnum, scope);
  if (!data)
    throw new EntityNotFoundError(`Room ${vnum} not found in immortal DB`);

  const { exits, extras, vnum: _v, ...fields } = data;

  // RESTRICT FKs: deleting the parent row would cascade-delete children we
  // just wrote (and impact in-game references like shop loadouts). The
  // RESTRICT clause surfaces the error so we can roll back cleanly.
  await tx.delete(roomexit).where(eq(roomexit.vnum, vnum));
  await tx.delete(roomextra).where(eq(roomextra.vnum, vnum));
  await tx
    .insert(room)
    .values({ ...fields, vnum })
    .onDuplicateKeyUpdate({ set: fields });

  for (const exit of exits) {
    const { block: _block, vnum: _ev, ...exitFields } = exit;
    await tx.insert(roomexit).values({ ...exitFields, vnum });
  }

  for (const extra of extras) {
    const { vnum: _exv, ...extraFields } = extra;
    await tx.insert(roomextra).values({ ...extraFields, vnum });
  }
}

async function publishMobTx(
  vnum: number,
  scope: OwnerScope,
  tx: SneezyTx,
): Promise<void> {
  const data = await getMob(vnum, scope);
  if (!data)
    throw new EntityNotFoundError(`Mob ${vnum} not found in immortal DB`);

  const { extras, immunities, vnum: _v, ...fields } = data;

  // Derive letter and pos the same way updateMob does
  const mobFields = { ...fields, ...deriveMobLetterAndPos(fields) };

  // RESTRICT FKs: deleting the parent row would cascade-delete children we
  // just wrote (and impact in-game references like shop loadouts). The
  // RESTRICT clause surfaces the error so we can roll back cleanly.
  await tx.delete(mobExtra).where(eq(mobExtra.vnum, vnum));
  await tx.delete(mobImm).where(eq(mobImm.vnum, vnum));
  await tx
    .insert(mob)
    .values({ ...mobFields, vnum })
    .onDuplicateKeyUpdate({ set: mobFields });

  for (const extra of extras) {
    const { vnum: _ev, ...extraFields } = extra;
    await tx.insert(mobExtra).values({ ...extraFields, vnum });
  }

  for (const imm of immunities) {
    const { vnum: _iv, ...immFields } = imm;
    await tx.insert(mobImm).values({ ...immFields, vnum });
  }
}

async function publishObjectTx(
  vnum: number,
  scope: OwnerScope,
  tx: SneezyTx,
): Promise<void> {
  const data = await getObject(vnum, scope);
  if (!data)
    throw new EntityNotFoundError(`Object ${vnum} not found in immortal DB`);

  const { affects, extras, vnum: _v, ...fields } = data;

  // RESTRICT FKs: deleting the parent row would cascade-delete children we
  // just wrote (and impact in-game references like shop loadouts). The
  // RESTRICT clause surfaces the error so we can roll back cleanly.
  await tx.delete(objaffect).where(eq(objaffect.vnum, vnum));
  await tx.delete(objextra).where(eq(objextra.vnum, vnum));
  await tx
    .insert(obj)
    .values({ ...fields, vnum })
    .onDuplicateKeyUpdate({ set: fields });

  for (const affect of affects) {
    const { vnum: _av, ...affectFields } = affect;
    await tx.insert(objaffect).values({ ...affectFields, vnum });
  }

  for (const extra of extras) {
    const { vnum: _ev, ...extraFields } = extra;
    await tx.insert(objextra).values({ ...extraFields, vnum });
  }
}

async function publishMobResponseTx(
  vnum: number,
  scope: OwnerScope,
  tx: SneezyTx,
): Promise<void> {
  const data = await getMobResponse(vnum, scope);
  if (!data) {
    throw new EntityNotFoundError(
      `Mob response ${vnum} not found in immortal DB`,
    );
  }

  // Parent-existence check: the sneezy mobresponses FK requires a matching
  // mob.vnum row. If the parent mob is not yet in sneezy, throwing before
  // the insert surfaces a clean 422 instead of a raw FK error.
  const [parent] = await tx
    .select({ vnum: mob.vnum })
    .from(mob)
    .where(eq(mob.vnum, vnum));
  if (!parent) {
    throw new MobResponseMissingParentError(vnum);
  }

  await tx
    .insert(mobresponses)
    .values({ response: data.response, vnum })
    .onDuplicateKeyUpdate({ set: { response: data.response } });
}

const PUBLISH_DISPATCH: Record<
  string,
  (vnum: number, scope: OwnerScope, tx: SneezyTx) => Promise<void>
> = {
  mob: publishMobTx,
  "mob-response": publishMobResponseTx,
  object: publishObjectTx,
  room: publishRoomTx,
};

type EntityType = "mob" | "mob-response" | "object" | "room";

export async function publishBulk(
  entities: Array<{
    ownerPlayerId: number;
    type: string;
    vnum: number;
  }>,
): Promise<void> {
  // Stable sort so mob entries precede mob-response entries sharing the
  // same (vnum, ownerPlayerId). Array.prototype.toSorted is stable.
  const ordered = [...entities].toSorted((a, b) => {
    if (a.vnum !== b.vnum || a.ownerPlayerId !== b.ownerPlayerId) return 0;
    if (a.type === "mob" && b.type === "mob-response") return -1;
    if (a.type === "mob-response" && b.type === "mob") return 1;
    return 0;
  });

  // Acquire best-effort locks on each entity's immortal parent row before
  // the sneezy transaction begins.
  for (const { ownerPlayerId, type, vnum } of ordered) {
    if (!isEntityType(type)) throw new Error(`Unknown entity type: ${type}`);
    await lockImmortalParent(type, vnum, { playerId: ownerPlayerId });
  }

  await sneezyDb.transaction(async (tx) => {
    for (const { ownerPlayerId, type, vnum } of ordered) {
      const handler = PUBLISH_DISPATCH[type];
      if (!handler) throw new Error(`Unknown entity type: ${type}`);
      await handler(vnum, { playerId: ownerPlayerId }, tx);
    }
  });
}

function isEntityType(value: string): value is EntityType {
  return (
    value === "mob" ||
    value === "mob-response" ||
    value === "object" ||
    value === "room"
  );
}
