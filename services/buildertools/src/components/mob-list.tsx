import { EntityListPage } from "@/components/entity-list-page.tsx";
import { RACE_TYPES } from "@/shared/enums/index.ts";

export function MobList({
  from,
  to,
}: {
  from: number | undefined;
  to: number | undefined;
}) {
  return (
    <EntityListPage
      from={from}
      to={to}
      toEntityItem={(m, fallbackPlayerId) => {
        const item: {
          metadata: string;
          name: string;
          owner?: string;
          playerId: number;
          secondary: string;
          vnum: number;
        } = {
          metadata: `Lvl ${m.level} / ${RACE_TYPES.find((r) => r.value === m.race)?.label ?? "Unknown"}`,
          name: m.short_desc || m.name,
          playerId: m.player_id ?? fallbackPlayerId,
          secondary: m.name,
          vnum: m.vnum,
        };
        if (m.owner !== undefined) item.owner = m.owner;
        return item;
      }}
      type="mob"
    />
  );
}
