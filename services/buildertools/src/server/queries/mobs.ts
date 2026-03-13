import { and, eq, gte, inArray, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Mob, MobListItem } from "@/shared/schemas/mob.ts";

import { mobExtraSchema } from "@/shared/schemas/mob.ts";

import { immortalDb } from "../db.ts";
import { mob, mobExtra, mobImm, mobresponses } from "../schema/immortal.ts";
import { ownerEq, type OwnerScope, scopeOwner } from "./owner-scope.ts";

export async function listMobs(
  blocks: null | VnumBlock[],
  scope: OwnerScope,
): Promise<MobListItem[]> {
  if (blocks !== null && blocks.length === 0) {
    return [];
  }

  const blockFilter =
    blocks === null
      ? undefined
      : or(
          ...blocks.map((b) =>
            and(gte(mob.vnum, b.start), lte(mob.vnum, b.end)),
          ),
        );

  return immortalDb
    .select({
      level: mob.level,
      name: mob.name,
      race: mob.race,
      short_desc: mob.short_desc,
      vnum: mob.vnum,
    })
    .from(mob)
    .where(and(ownerEq(mob.owner, scope), blockFilter))
    .orderBy(mob.vnum);
}

export async function getMob(
  vnum: number,
  scope: OwnerScope,
): Promise<Mob | null> {
  const [row] = await immortalDb
    .select()
    .from(mob)
    .where(and(eq(mob.vnum, vnum), ownerEq(mob.owner, scope)));

  if (!row) {
    return null;
  }

  const [extras, immunities] = await Promise.all([
    immortalDb
      .select()
      .from(mobExtra)
      .where(and(eq(mobExtra.vnum, vnum), ownerEq(mobExtra.owner, scope))),
    immortalDb
      .select()
      .from(mobImm)
      .where(and(eq(mobImm.vnum, vnum), ownerEq(mobImm.owner, scope))),
  ]);

  const { letter: _letter, owner: _owner, pos: _pos, ...mobFields } = row;
  return {
    ...mobFields,
    adjacent_sound: mobFields.adjacent_sound ?? "",
    extras: extras.map(({ description, owner: _eo, ...fields }) =>
      mobExtraSchema.parse({ ...fields, description: description ?? "" }),
    ),
    immunities: immunities.map(({ amt, owner: _io, ...fields }) => ({
      ...fields,
      amt: amt ?? 0,
    })),
    local_sound: mobFields.local_sound ?? "",
  };
}

export async function createMob(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await immortalDb.insert(mob).values({
    ac: 0,
    actions: 0,
    adjacent_sound: "",
    affects: 0,
    agi: 0,
    attacks: 1,
    bra: 0,
    can_be_seen: 0,
    cha: 0,
    class: 0,
    con: 0,
    damage_level: 0,
    damage_precision: 0,
    def_position: 9,
    description: "",
    dex: 0,
    fact_perc: 0,
    faction: 0,
    foc: 0,
    gold: 0,
    height: 0,
    hpbonus: 0,
    intel: 0,
    kar: 0,
    letter: "L",
    level: 1,
    local_sound: "",
    long_desc: "",
    max_exist: 0,
    name: "",
    owner: scopeOwner(scope),
    per: 0,
    pos: 9,
    race: 0,
    sex: 0,
    short_desc: "",
    skin: 0,
    spe: 0,
    spec_proc: 0,
    str: 0,
    tohit: 0,
    vision: 0,
    vnum,
    weight: 0,
    wis: 0,
  });
}

export async function updateMob(
  vnum: number,
  data: Mob,
  scope: OwnerScope,
): Promise<void> {
  const owner = scopeOwner(scope);
  const { extras, immunities, vnum: _vnum, ...mobFields } = data;
  const letter = mobFields.local_sound && !mobFields.adjacent_sound ? "A" : "L";

  await immortalDb.transaction(async (tx) => {
    await tx
      .update(mob)
      .set({ ...mobFields, letter, owner, pos: mobFields.def_position })
      .where(and(eq(mob.vnum, vnum), ownerEq(mob.owner, scope)));

    // Replace extras atomically
    await tx
      .delete(mobExtra)
      .where(and(eq(mobExtra.vnum, vnum), ownerEq(mobExtra.owner, scope)));
    for (const extra of extras) {
      const { vnum: _ev, ...fields } = extra;
      await tx.insert(mobExtra).values({ ...fields, owner, vnum });
    }

    // Replace immunities atomically
    await tx
      .delete(mobImm)
      .where(and(eq(mobImm.vnum, vnum), ownerEq(mobImm.owner, scope)));
    for (const imm of immunities) {
      const { vnum: _iv, ...fields } = imm;
      await tx.insert(mobImm).values({ ...fields, owner, vnum });
    }
  });
}

export async function deleteMob(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx
      .delete(mobExtra)
      .where(and(eq(mobExtra.vnum, vnum), ownerEq(mobExtra.owner, scope)));
    await tx
      .delete(mobImm)
      .where(and(eq(mobImm.vnum, vnum), ownerEq(mobImm.owner, scope)));
    await tx
      .delete(mobresponses)
      .where(
        and(eq(mobresponses.vnum, vnum), ownerEq(mobresponses.owner, scope)),
      );
    await tx
      .delete(mob)
      .where(and(eq(mob.vnum, vnum), ownerEq(mob.owner, scope)));
  });
}

export async function deleteMobs(
  vnums: number[],
  scope: OwnerScope,
): Promise<number> {
  let deleted = 0;
  await immortalDb.transaction(async (tx) => {
    await tx
      .delete(mobExtra)
      .where(
        and(inArray(mobExtra.vnum, vnums), ownerEq(mobExtra.owner, scope)),
      );
    await tx
      .delete(mobImm)
      .where(and(inArray(mobImm.vnum, vnums), ownerEq(mobImm.owner, scope)));
    await tx
      .delete(mobresponses)
      .where(
        and(
          inArray(mobresponses.vnum, vnums),
          ownerEq(mobresponses.owner, scope),
        ),
      );
    const result = await tx
      .delete(mob)
      .where(and(inArray(mob.vnum, vnums), ownerEq(mob.owner, scope)));
    deleted = result[0].affectedRows;
  });
  return deleted;
}

export async function mobExists(
  vnum: number,
  scope: OwnerScope,
): Promise<boolean> {
  const [row] = await immortalDb
    .select({ vnum: mob.vnum })
    .from(mob)
    .where(and(eq(mob.vnum, vnum), ownerEq(mob.owner, scope)))
    .limit(1);

  return row !== undefined;
}
