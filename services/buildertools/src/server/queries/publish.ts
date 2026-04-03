import { eq } from "drizzle-orm";

import type { MobResponse } from "@/shared/schemas/mob-response.ts";
import type { Mob } from "@/shared/schemas/mob.ts";
import type { Obj } from "@/shared/schemas/obj.ts";
import type { Room } from "@/shared/schemas/room.ts";

import { mobExtraSchema } from "@/shared/schemas/mob.ts";

import { sneezyDb } from "../db.ts";
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
import { getMobResponse } from "./mob-responses.ts";
import { getMob } from "./mobs.ts";
import { getObject } from "./objects.ts";
import { getRoom } from "./rooms.ts";

// Drizzle transaction type - inferred from sneezyDb.transaction callback
type SneezyTx = Parameters<Parameters<typeof sneezyDb.transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Read helpers - fetch from sneezy (production) DB
// ---------------------------------------------------------------------------

type OwnerScope = "all" | { playerId: number };

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

// ---------------------------------------------------------------------------
// Publish helpers - copy from immortal to sneezy (delete-then-insert)
// ---------------------------------------------------------------------------

export async function getSneezyMobResponse(
  vnum: number,
): Promise<MobResponse | null> {
  const [row] = await sneezyDb
    .select({ response: mobresponses.response, vnum: mobresponses.vnum })
    .from(mobresponses)
    .where(eq(mobresponses.vnum, vnum));

  return row ?? null;
}

export async function publishRoom(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await sneezyDb.transaction((tx) => publishRoomTx(vnum, scope, tx));
}

export async function publishMob(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await sneezyDb.transaction((tx) => publishMobTx(vnum, scope, tx));
}

export async function publishObject(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await sneezyDb.transaction((tx) => publishObjectTx(vnum, scope, tx));
}

export async function publishMobResponse(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await sneezyDb.transaction((tx) => publishMobResponseTx(vnum, scope, tx));
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
  if (!data) throw new Error(`Room ${vnum} not found in immortal DB`);

  const { exits, extras, vnum: _v, ...fields } = data;

  // Delete existing production data (children first)
  await tx.delete(roomexit).where(eq(roomexit.vnum, vnum));
  await tx.delete(roomextra).where(eq(roomextra.vnum, vnum));
  await tx.delete(room).where(eq(room.vnum, vnum));

  await tx.insert(room).values({ ...fields, vnum });

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
  if (!data) throw new Error(`Mob ${vnum} not found in immortal DB`);

  const { extras, immunities, vnum: _v, ...fields } = data;

  // Derive letter and pos the same way updateMob does
  const letter = fields.local_sound && !fields.adjacent_sound ? "A" : "L";
  const pos = fields.def_position;

  // Delete existing production data (children first)
  await tx.delete(mobExtra).where(eq(mobExtra.vnum, vnum));
  await tx.delete(mobImm).where(eq(mobImm.vnum, vnum));
  await tx.delete(mob).where(eq(mob.vnum, vnum));

  await tx.insert(mob).values({ ...fields, letter, pos, vnum });

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
  if (!data) throw new Error(`Object ${vnum} not found in immortal DB`);

  const { affects, extras, vnum: _v, ...fields } = data;

  // Delete existing production data (children first)
  await tx.delete(objaffect).where(eq(objaffect.vnum, vnum));
  await tx.delete(objextra).where(eq(objextra.vnum, vnum));
  await tx.delete(obj).where(eq(obj.vnum, vnum));

  await tx.insert(obj).values({ ...fields, vnum });

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
  if (!data) throw new Error(`Mob response ${vnum} not found in immortal DB`);

  await tx.delete(mobresponses).where(eq(mobresponses.vnum, vnum));
  await tx.insert(mobresponses).values({ response: data.response, vnum });
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

export async function publishBulk(
  entities: Array<{ playerId: number; type: string; vnum: number }>,
): Promise<void> {
  await sneezyDb.transaction(async (tx) => {
    for (const { playerId, type, vnum } of entities) {
      const handler = PUBLISH_DISPATCH[type];
      if (!handler) throw new Error(`Unknown entity type: ${type}`);
      await handler(vnum, { playerId }, tx);
    }
  });
}
