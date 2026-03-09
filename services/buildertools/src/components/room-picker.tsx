import { z } from "zod";

import { EntityPicker } from "@/components/entity-picker.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { roomKeys } from "@/shared/query-keys.ts";

const roomSearchSchema = z.array(
  z.object({
    name: z.string(),
    vnum: z.number(),
  }),
);

const formatValue = (v: number) => (v === 0 ? "" : String(v));

interface RoomPickerProps {
  id?: string | undefined;
  onChange: (vnum: number) => void;
  value: number;
}

export function RoomPicker({ id, onChange, value }: RoomPickerProps) {
  return (
    <EntityPicker
      commitValue={(text) => {
        const trimmed = text.trim();
        if (trimmed === "") {
          return { display: "", value: 0 };
        }
        const num = Number.parseInt(trimmed, 10);
        if (Number.isNaN(num) || num < 0 || num > 49_999) return null;
        return { display: num === 0 ? "" : String(num), value: num };
      }}
      formatValue={formatValue}
      id={id}
      noResultsMessage="No rooms found"
      onChange={onChange}
      queryKeyFn={(text) => roomKeys.search(text)}
      searchFn={async (text) => {
        const results = await apiFetch(
          `/api/rooms/search?q=${encodeURIComponent(text)}`,
          roomSearchSchema,
        );
        return results.map((r) => ({ label: r.name, vnum: r.vnum }));
      }}
      value={value}
    />
  );
}
