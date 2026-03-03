import { and, eq } from "drizzle-orm";

import type { MobResponse } from "@/shared/schemas/mob-response.ts";

import { immortalDb } from "../db.ts";
import { mobresponses } from "../schema/immortal.ts";
import { ownerEq, type OwnerScope, scopeOwner } from "./owner-scope.ts";

export async function getMobResponse(
  vnum: number,
  scope: OwnerScope,
): Promise<MobResponse | null> {
  const [row] = await immortalDb
    .select({ response: mobresponses.response, vnum: mobresponses.vnum })
    .from(mobresponses)
    .where(
      and(eq(mobresponses.vnum, vnum), ownerEq(mobresponses.owner, scope)),
    );

  return row ?? null;
}

export async function upsertMobResponse(
  vnum: number,
  response: string,
  scope: OwnerScope,
): Promise<void> {
  const owner = scopeOwner(scope);
  // Table has no unique constraint, so onDuplicateKeyUpdate would never fire.
  // Delete-then-insert in a transaction ensures exactly one row per owner+vnum.
  await immortalDb.transaction(async (tx) => {
    await tx
      .delete(mobresponses)
      .where(
        and(eq(mobresponses.vnum, vnum), ownerEq(mobresponses.owner, scope)),
      );
    await tx.insert(mobresponses).values({ owner, response, vnum });
  });
}

export async function deleteMobResponse(
  vnum: number,
  scope: OwnerScope,
): Promise<void> {
  await immortalDb
    .delete(mobresponses)
    .where(
      and(eq(mobresponses.vnum, vnum), ownerEq(mobresponses.owner, scope)),
    );
}
