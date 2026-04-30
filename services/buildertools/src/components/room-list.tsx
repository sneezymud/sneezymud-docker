import { EntityListPage } from "@/components/entity-list-page.tsx";
import { SECTOR_TYPES } from "@/shared/enums/index.ts";

export function RoomList({
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
      toEntityItem={(r, fallbackPlayerId) => {
        const item: {
          metadata?: string;
          name: string;
          owner?: string;
          playerId: number;
          vnum: number;
        } = {
          name: r.name,
          playerId: r.player_id ?? fallbackPlayerId,
          vnum: r.vnum,
        };
        const sectorLabel = SECTOR_TYPES.find(
          (s) => s.value === r.sector,
        )?.label;
        if (sectorLabel !== undefined) item.metadata = sectorLabel;
        if (r.owner !== undefined) item.owner = r.owner;
        return item;
      }}
      type="room"
    />
  );
}
