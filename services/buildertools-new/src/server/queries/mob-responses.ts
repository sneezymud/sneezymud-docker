import type { RowDataPacket } from "mysql2/promise";

import type { MobResponse } from "@/shared/schemas/mob-response.ts";

import { immortalPool } from "../db.ts";

interface MobResponseRow extends RowDataPacket {
  response: string;
  vnum: number;
}

export async function getMobResponse(
  vnum: number,
): Promise<MobResponse | null> {
  const [rows] = await immortalPool.execute<MobResponseRow[]>(
    "SELECT vnum, response FROM mobresponses WHERE vnum = ?",
    [vnum],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return { response: row.response, vnum: row.vnum };
}

export async function upsertMobResponse(
  vnum: number,
  response: string,
  owner: string,
): Promise<void> {
  await immortalPool.execute(
    `INSERT INTO mobresponses (vnum, owner, response) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE response = ?, owner = ?`,
    [vnum, owner, response, response, owner],
  );
}

export async function deleteMobResponse(vnum: number): Promise<void> {
  await immortalPool.execute("DELETE FROM mobresponses WHERE vnum = ?", [vnum]);
}
