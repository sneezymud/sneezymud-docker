import type { EnumEntry } from "@/shared/enums/types.ts";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface EnumSelectProps {
  entries: EnumEntry[];
  id?: string | undefined;
  onChange: (value: number) => void;
  value: number;
}

const SEARCHABLE_THRESHOLD = 15;

export function EnumSelect({ entries, id, onChange, value }: EnumSelectProps) {
  if (entries.length > SEARCHABLE_THRESHOLD) {
    return (
      <SearchableEnumSelect
        entries={entries}
        id={id}
        onChange={onChange}
        value={value}
      />
    );
  }

  return (
    <NativeEnumSelect
      entries={entries}
      id={id}
      onChange={onChange}
      value={value}
    />
  );
}

function NativeEnumSelect({ entries, id, onChange, value }: EnumSelectProps) {
  const known = entries.some((e) => e.value === value);

  return (
    <Select
      onValueChange={(v) => {
        onChange(Number(v));
      }}
      value={String(value)}
    >
      <SelectTrigger
        className="w-full"
        id={id}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {known ? null : (
          <SelectItem value={String(value)}>Unknown ({value})</SelectItem>
        )}
        {entries.map((entry) => (
          <SelectItem
            key={entry.value}
            value={String(entry.value)}
          >
            {entry.label} ({entry.value})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SearchableEnumSelect({
  entries,
  id,
  onChange,
  value,
}: EnumSelectProps) {
  const current = entries.find((e) => e.value === value) ?? null;

  return (
    <Combobox
      itemToStringLabel={(entry: EnumEntry) =>
        `${entry.label} (${entry.value})`
      }
      onValueChange={(entry: EnumEntry | null) => {
        if (entry) {
          onChange(entry.value);
        }
      }}
      value={current}
    >
      <ComboboxInput
        className="w-full"
        id={id}
        placeholder={current ? undefined : `Unknown (${value})`}
      />
      <ComboboxContent>
        <ComboboxList>
          {entries.map((entry) => (
            <ComboboxItem
              key={entry.value}
              value={entry}
            >
              {entry.label}{" "}
              <span className="text-muted-foreground">({entry.value})</span>
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>No matches</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
