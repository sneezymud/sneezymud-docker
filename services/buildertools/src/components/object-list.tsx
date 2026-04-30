import { EntityListPage } from "@/components/entity-list-page.tsx";
import { ITEM_TYPES } from "@/shared/enums/index.ts";

export function ObjectList({
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
      toEntityItem={(o, fallbackPlayerId) => {
        const item: {
          metadata?: string;
          name: string;
          owner?: string;
          playerId: number;
          secondary: string;
          vnum: number;
        } = {
          name: o.short_desc || o.name,
          playerId: o.player_id ?? fallbackPlayerId,
          secondary: o.name,
          vnum: o.vnum,
        };
        const typeLabel = ITEM_TYPES.find((t) => t.value === o.type)?.label;
        if (typeLabel !== undefined) item.metadata = typeLabel;
        if (o.owner !== undefined) item.owner = o.owner;
        return item;
      }}
      type="object"
    />
  );
}
