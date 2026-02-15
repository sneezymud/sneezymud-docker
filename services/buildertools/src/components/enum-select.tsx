import type { EnumEntry } from "@/shared/enums/types.ts";

interface EnumSelectProps {
  entries: EnumEntry[];
  id?: string;
  onChange: (value: number) => void;
  value: number;
}

export function EnumSelect({ entries, id, onChange, value }: EnumSelectProps) {
  const known = entries.some((e) => e.value === value);

  return (
    <select
      className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
      id={id}
      onChange={(e) => {
        onChange(Number(e.target.value));
      }}
      value={value}
    >
      {known ? null : <option value={value}>Unknown ({String(value)})</option>}
      {entries.map((entry) => (
        <option
          key={entry.value}
          value={entry.value}
        >
          {entry.label} ({String(entry.value)})
        </option>
      ))}
    </select>
  );
}
