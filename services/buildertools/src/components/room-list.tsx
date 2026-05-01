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
      toEntityItem={(
        { name, owner, player_id, sector, vnum },
        fallbackPlayerId,
      ) => {
        const item: {
          metadata?: string;
          name: string;
          owner?: string;
          playerId: number;
          vnum: number;
        } = {
          name,
          playerId: player_id ?? fallbackPlayerId,
          vnum,
        };
        const sectorLabel = SECTOR_TYPES.find((s) => s.value === sector)?.label;
        if (sectorLabel !== undefined) item.metadata = sectorLabel;
        if (owner !== undefined) item.owner = owner;
        return item;
      }}
      type="room"
    />
  );
}
