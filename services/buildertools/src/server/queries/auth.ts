import type { RowDataPacket } from "mysql2/promise";

import type { SessionUser, VnumBlock } from "@/shared/schemas/auth.ts";

import { verifyPassword } from "../auth/crypt.ts";
import { sneezyPool } from "../db.ts";

export type AuthResult =
  | { kind: "no_blocks"; playerName: string }
  | { kind: "not_found" }
  | { kind: "success"; user: SessionUser }
  | { kind: "wrong_password" };

interface AuthRow extends RowDataPacket {
  blockaend: number;
  blockastart: number;
  blockbend: number;
  blockbstart: number;
  passwd: string;
  player_name: string;
}

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
  const [rows] = await sneezyPool.execute<AuthRow[]>(
    `SELECT p.name AS player_name, a.passwd,
            w.blockastart, w.blockaend, w.blockbstart, w.blockbend
     FROM account a
     JOIN player p ON p.account_id = a.account_id
     JOIN wizdata w ON w.player_id = p.id
     WHERE a.name = ?`,
    [username],
  );

  const row = rows[0];
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
