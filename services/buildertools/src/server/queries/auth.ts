import { count, desc, eq, sql } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";

import {
  isSenior as computeIsSenior,
  hasPower,
  POWER,
} from "@/shared/powers.ts";

import { verifyPassword } from "../auth/crypt.ts";
import { sneezyDb } from "../db.ts";
import { account, player, wizdata, wizpower } from "../schema/sneezy.ts";

export type AuthResult =
  | { kind: "not_found" }
  | { kind: "not_immortal"; playerName: string }
  | {
      kind: "success";
      user: {
        blocks: VnumBlock[];
        isSenior: boolean;
        playerId: number;
        playerName: string;
        powers: number[];
        username: string;
      };
    }
  | { kind: "wrong_password" };

/**
 * Authenticate a builder account and return session data.
 *
 * Joins account -> player -> wizdata, with a LEFT JOIN to wizpower to
 * count granted powers. ORDER BY wizpower_count DESC picks the immortal
 * character (the one with actual wizard powers) when an account has
 * multiple characters with wizdata rows.
 */
export async function authenticateBuilder(
  username: string,
  password: string,
): Promise<AuthResult> {
  const wizpowerCount = count(wizpower.wizpower).as("wizpower_count");

  const [row] = await sneezyDb
    .select({
      blockaend: wizdata.blockaend,
      blockastart: wizdata.blockastart,
      blockbend: wizdata.blockbend,
      blockbstart: wizdata.blockbstart,
      passwd: account.passwd,
      player_id: player.id,
      player_name: player.name,
      wizpower_count: wizpowerCount,
    })
    .from(account)
    .innerJoin(player, eq(player.account_id, account.account_id))
    .leftJoin(wizdata, eq(wizdata.player_id, player.id))
    .leftJoin(wizpower, eq(wizpower.player_id, player.id))
    .where(eq(account.name, username))
    .groupBy(
      account.passwd,
      player.name,
      wizdata.blockastart,
      wizdata.blockaend,
      wizdata.blockbstart,
      wizdata.blockbend,
    )
    .orderBy(desc(sql`${wizpowerCount}`));

  if (!row) {
    return { kind: "not_found" };
  }

  if (!row.passwd || !verifyPassword(password, username, row.passwd)) {
    return { kind: "wrong_password" };
  }

  const playerName = row.player_name;
  const playerId = row.player_id;

  const powerRows = await sneezyDb
    .select({ wizpower: wizpower.wizpower })
    .from(wizpower)
    .where(eq(wizpower.player_id, playerId));
  const powers = powerRows.map((r) => r.wizpower);

  if (!hasPower(powers, POWER.BUILDER)) {
    return { kind: "not_immortal", playerName };
  }

  const blocks: VnumBlock[] = [];
  const blockAStart = row.blockastart ?? 0;
  const blockAEnd = row.blockaend ?? 0;
  const blockBStart = row.blockbstart ?? 0;
  const blockBEnd = row.blockbend ?? 0;

  if (blockAStart > 0 || blockAEnd > 0) {
    blocks.push({ end: blockAEnd, start: blockAStart });
  }
  if (blockBStart > 0 || blockBEnd > 0) {
    blocks.push({ end: blockBEnd, start: blockBStart });
  }

  return {
    kind: "success",
    user: {
      blocks,
      isSenior: computeIsSenior(powers),
      playerId,
      playerName,
      powers,
      username,
    },
  };
}

/**
 * Re-fetch a session user's powers and blocks from the database.
 * Used by touchSession to keep session data fresh without requiring
 * re-authentication. Returns null if the player no longer exists or
 * lost builder access.
 */
export async function refreshSessionUser(playerId: number): Promise<null | {
  blocks: VnumBlock[];
  isSenior: boolean;
  playerId: number;
  powers: number[];
}> {
  const [row] = await sneezyDb
    .select({
      blockaend: wizdata.blockaend,
      blockastart: wizdata.blockastart,
      blockbend: wizdata.blockbend,
      blockbstart: wizdata.blockbstart,
      player_id: player.id,
    })
    .from(player)
    .leftJoin(wizdata, eq(wizdata.player_id, player.id))
    .where(eq(player.id, playerId));

  if (!row) return null;

  const powerRows = await sneezyDb
    .select({ wizpower: wizpower.wizpower })
    .from(wizpower)
    .where(eq(wizpower.player_id, row.player_id));
  const powers = powerRows.map((r) => r.wizpower);

  if (!hasPower(powers, POWER.BUILDER)) return null;

  const blocks: VnumBlock[] = [];
  const blockAStart = row.blockastart ?? 0;
  const blockAEnd = row.blockaend ?? 0;
  const blockBStart = row.blockbstart ?? 0;
  const blockBEnd = row.blockbend ?? 0;
  if (blockAStart > 0 || blockAEnd > 0) {
    blocks.push({ end: blockAEnd, start: blockAStart });
  }
  if (blockBStart > 0 || blockBEnd > 0) {
    blocks.push({ end: blockBEnd, start: blockBStart });
  }

  return {
    blocks,
    isSenior: computeIsSenior(powers),
    playerId: row.player_id,
    powers,
  };
}
