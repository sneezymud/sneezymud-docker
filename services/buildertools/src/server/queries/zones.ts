import type { Zone } from "@/shared/schemas/zone.ts";

import { sneezyDb } from "../db.ts";
import { zone } from "../schema/sneezy.ts";

export async function listZones(): Promise<Zone[]> {
  return sneezyDb.select().from(zone).orderBy(zone.zone_nr);
}
