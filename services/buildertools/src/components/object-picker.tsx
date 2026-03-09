import { z } from "zod";

import { EntityPicker } from "@/components/entity-picker.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { objectKeys } from "@/shared/query-keys.ts";

const objectSearchSchema = z.array(
  z.object({
    short_desc: z.string(),
    vnum: z.number(),
  }),
);

const formatValue = (v: number) => (v <= 0 ? "" : String(v));

interface ObjectPickerProps {
  id?: string | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onChange: (vnum: number) => void;
  value: number;
}

export function ObjectPicker({
  id,
  max,
  min,
  onChange,
  value,
}: ObjectPickerProps) {
  return (
    <EntityPicker
      commitValue={(text) => {
        if (text === "" || text === "-") return null;
        const num = Number.parseInt(text, 10);
        if (
          Number.isNaN(num) ||
          (min !== undefined && num < min) ||
          (max !== undefined && num > max)
        ) {
          return null;
        }
        return { display: formatValue(num), value: num };
      }}
      formatValue={formatValue}
      id={id}
      noResultsMessage="No objects found"
      onChange={onChange}
      queryKeyFn={(text) => objectKeys.search(text)}
      searchFn={async (text) => {
        const results = await apiFetch(
          `/api/objects/search?q=${encodeURIComponent(text)}`,
          objectSearchSchema,
        );
        return results.map((r) => ({ label: r.short_desc, vnum: r.vnum }));
      }}
      value={value}
    />
  );
}
