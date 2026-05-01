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
      toEntityItem={(
        { level, name, owner, player_id, race, short_desc, vnum },
        fallbackPlayerId,
      ) => {
        const item: {
          metadata: string;
          name: string;
          owner?: string;
          playerId: number;
          secondary: string;
          vnum: number;
        } = {
          metadata: `Lvl ${level} / ${RACE_TYPES.find((r) => r.value === race)?.label ?? "Unknown"}`,
          name: short_desc || name,
          playerId: player_id ?? fallbackPlayerId,
          secondary: name,
          vnum,
        };
        if (owner !== undefined) item.owner = owner;
        return item;
      }}
      type="mob"
    />
  );
}
