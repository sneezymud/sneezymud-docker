import { eq } from "drizzle-orm";

import type { MobResponse } from "@/shared/schemas/mob-response.ts";

import { immortalDb } from "../db.ts";
import { mobresponses } from "../schema/immortal.ts";

export async function getMobResponse(
  vnum: number,
): Promise<MobResponse | null> {
  const [row] = await immortalDb
    .select({ response: mobresponses.response, vnum: mobresponses.vnum })
    .from(mobresponses)
    .where(eq(mobresponses.vnum, vnum));

  return row ?? null;
}

export async function upsertMobResponse(
  vnum: number,
  response: string,
  owner: string,
): Promise<void> {
  await immortalDb
    .insert(mobresponses)
    .values({ owner, response, vnum })
    .onDuplicateKeyUpdate({ set: { owner, response } });
}

export async function deleteMobResponse(vnum: number): Promise<void> {
  await immortalDb.delete(mobresponses).where(eq(mobresponses.vnum, vnum));
}
