import { eq } from "drizzle-orm";

import type { SessionUser, VnumBlock } from "@/shared/schemas/auth.ts";

import { verifyPassword } from "../auth/crypt.ts";
import { sneezyDb } from "../db.ts";
import { account, player, wizdata } from "../schema/sneezy.ts";

export type AuthResult =
  | { kind: "no_blocks"; playerName: string }
  | { kind: "not_found" }
  | { kind: "success"; user: SessionUser }
  | { kind: "wrong_password" };

/**
 * Authenticate a builder account and return session data.
 *
 * Joins account → player → wizdata to get credentials and vnum assignments
 * in a single query. Returns a discriminated result indicating the outcome.
 */
export async function authenticateBuilder(
  username: string,
  password: string,
): Promise<AuthResult> {
  const [row] = await sneezyDb
    .select({
      blockaend: wizdata.blockaend,
      blockastart: wizdata.blockastart,
      blockbend: wizdata.blockbend,
      blockbstart: wizdata.blockbstart,
      passwd: account.passwd,
      player_name: player.name,
    })
    .from(account)
    .innerJoin(player, eq(player.account_id, account.account_id))
    .innerJoin(wizdata, eq(wizdata.player_id, player.id))
    .where(eq(account.name, username));

  if (!row) {
    return { kind: "not_found" };
  }

  if (!verifyPassword(password, username, row.passwd)) {
    return { kind: "wrong_password" };
  }

  const blocks: VnumBlock[] = [];
  if (row.blockastart > 0 || row.blockaend > 0) {
    blocks.push({ end: row.blockaend, start: row.blockastart });
  }
  if (row.blockbstart > 0 || row.blockbend > 0) {
    blocks.push({ end: row.blockbend, start: row.blockbstart });
  }

  if (blocks.length === 0) {
    return { kind: "no_blocks", playerName: row.player_name };
  }

  return {
    kind: "success",
    user: {
      blocks,
      playerName: row.player_name,
      username,
    },
  };
}
