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
import { cn } from "@/lib/utils.ts";

interface EnumSelectProps {
  className?: string | undefined;
  disabled?: boolean | undefined;
  entries: EnumEntry[];
  id?: string | undefined;
  onChange: (value: number) => void;
  value: number;
}

const SEARCHABLE_THRESHOLD = 15;

export function EnumSelect({
  className,
  disabled,
  entries,
  id,
  onChange,
  value,
}: EnumSelectProps) {
  if (entries.length > SEARCHABLE_THRESHOLD) {
    return (
      <SearchableEnumSelect
        className={className}
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
      className={className}
      disabled={disabled}
      entries={entries}
      id={id}
      onChange={onChange}
      value={value}
    />
  );
}

function NativeEnumSelect({
  className,
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
        className={cn("w-full", className)}
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
  className,
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
        className={cn("w-full", className)}
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
