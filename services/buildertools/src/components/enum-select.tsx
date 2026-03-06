import type { EnumEntry } from "@/shared/types/enums.ts";

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
  disabled?: boolean | undefined;
  entries: EnumEntry[];
  id?: string | undefined;
  onChange: (value: number) => void;
  value: number;
}

const SEARCHABLE_THRESHOLD = 15;

export function EnumSelect({
  disabled,
  entries,
  id,
  onChange,
  value,
}: EnumSelectProps) {
  if (entries.length > SEARCHABLE_THRESHOLD) {
    return (
      <SearchableEnumSelect
        disabled={disabled}
        entries={entries}
        id={id}
        onChange={onChange}
        value={value}
      />
    );
  }

  return (
    <NativeEnumSelect
      disabled={disabled}
      entries={entries}
      id={id}
      onChange={onChange}
      value={value}
    />
  );
}

function NativeEnumSelect({
  disabled,
  entries,
  id,
  onChange,
  value,
}: EnumSelectProps) {
  const selectable = entries.filter((e) => !e.disabledReason);
  const known = entries.some((e) => e.value === value);
  const knownSelectable = selectable.some((e) => e.value === value);
  const displayLabel =
    known && !knownSelectable
      ? entries.find((e) => e.value === value)?.label
      : null;

  return (
    <Select
      disabled={disabled === true}
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
        {displayLabel ? (
          <SelectItem value={String(value)}>
            {displayLabel} ({value})
          </SelectItem>
        ) : known ? null : (
          <SelectItem value={String(value)}>Unknown ({value})</SelectItem>
        )}

        {selectable.map((entry) => (
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
  disabled,
  entries,
  id,
  onChange,
  value,
}: EnumSelectProps) {
  const selectable = entries.filter((e) => !e.disabledReason);
  const current = entries.find((e) => e.value === value) ?? null;
  const currentSelectable = selectable.find((e) => e.value === value) ?? null;

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
      value={currentSelectable}
    >
      <ComboboxInput
        className="w-full"
        disabled={disabled === true}
        id={id}
        placeholder={
          current && !currentSelectable
            ? `${current.label} (${current.value})`
            : current
              ? undefined
              : `Unknown (${value})`
        }
      />

      <ComboboxContent>
        <ComboboxList>
          {selectable.map((entry) => (
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
