import type { RowDataPacket } from "mysql2/promise";

import type { Zone } from "@/shared/schemas/zone.ts";

import { sneezyPool } from "../db.ts";

interface ZoneRow extends RowDataPacket {
  age: null | number;
  bottom: null | number;
  lifespan: null | number;
  reset_mode: null | number;
  top: null | number;
  util_flag: null | number;
  zone_enabled: null | number;
  zone_name: string;
  zone_nr: number;
}

export async function listZones(): Promise<Zone[]> {
  const [rows] = await sneezyPool.execute<ZoneRow[]>(
    "SELECT * FROM zone ORDER BY zone_nr",
  );

  return rows.map((r) => ({
    age: r.age,
    bottom: r.bottom,
    lifespan: r.lifespan,
    reset_mode: r.reset_mode,
    top: r.top,
    util_flag: r.util_flag,
    zone_enabled: r.zone_enabled,
    zone_name: r.zone_name,
    zone_nr: r.zone_nr,
  }));
}
