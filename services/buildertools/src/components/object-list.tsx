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
      toEntityItem={(
        { name, owner, player_id, short_desc, type, vnum },
        fallbackPlayerId,
      ) => {
        const item: {
          metadata?: string;
          name: string;
          owner?: string;
          playerId: number;
          secondary: string;
          vnum: number;
        } = {
          name: short_desc || name,
          playerId: player_id ?? fallbackPlayerId,
          secondary: name,
          vnum,
        };
        const typeLabel = ITEM_TYPES.find((t) => t.value === type)?.label;
        if (typeLabel !== undefined) item.metadata = typeLabel;
        if (owner !== undefined) item.owner = owner;
        return item;
      }}
      type="object"
    />
  );
}
