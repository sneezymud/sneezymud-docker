import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

interface EntityListItem {
  name: string;
  vnum: number;
}

interface EntityListProps {
  basePath: string;
  entities: EntityListItem[];
  label: string;
  onCreateVnum?: (vnum: number) => void;
  vnumBlocks?: Array<{ end: number; start: number }> | undefined;
}

interface VnumPickerProps {
  existingVnums: Set<number>;
  onClose: () => void;
  onCreate: (vnum: number) => void;
  vnumBlocks: Array<{ end: number; start: number }>;
}

export function EntityList({
  basePath,
  entities,
  label,
  onCreateVnum,
  vnumBlocks,
}: EntityListProps) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const filtered = search
    ? entities.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          String(e.vnum).includes(search),
      )
    : entities;

  const existingVnums = new Set(entities.map((e) => e.vnum));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">{label}</h2>
        {onCreateVnum ? (
          <button
            className="rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-600"
            onClick={() => {
              setShowCreate(true);
            }}
            type="button"
          >
            New {label.slice(0, -1)}
          </button>
        ) : null}
      </div>

      <input
        className="mb-4 w-full max-w-xs rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        placeholder="Search by vnum or name..."
        type="text"
        value={search}
      />

      {showCreate && vnumBlocks ? (
        <VnumPicker
          existingVnums={existingVnums}
          onClose={() => {
            setShowCreate(false);
          }}
          onCreate={(vnum) => {
            onCreateVnum?.(vnum);
            setShowCreate(false);
          }}
          vnumBlocks={vnumBlocks}
        />
      ) : null}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700/50 text-left text-zinc-400">
            <th className="px-3 py-2 font-medium">Vnum</th>
            <th className="px-3 py-2 font-medium">Name</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entity) => (
            <tr
              className="cursor-pointer border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30"
              key={entity.vnum}
              onClick={() => {
                void navigate({ to: `${basePath}/${String(entity.vnum)}` });
              }}
            >
              <td className="px-3 py-2 font-mono text-zinc-400">
                {entity.vnum}
              </td>
              <td className="px-3 py-2 text-zinc-200">
                {entity.name || "(unnamed)"}
              </td>
            </tr>
          ))}
          {filtered.length === 0 ? (
            <tr>
              <td
                className="px-3 py-8 text-center text-zinc-500"
                colSpan={2}
              >
                {search ? "No matches found" : "No entities yet"}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <p className="mt-2 text-xs text-zinc-500">
        {filtered.length} of {entities.length} shown
      </p>
    </div>
  );
}

function VnumPicker({
  existingVnums,
  onClose,
  onCreate,
  vnumBlocks,
}: VnumPickerProps) {
  const [vnumInput, setVnumInput] = useState("");

  // Find next available vnum
  let suggestedVnum: null | number = null;
  for (const block of vnumBlocks) {
    for (let v = block.start; v <= block.end; v++) {
      if (!existingVnums.has(v)) {
        suggestedVnum = v;
        break;
      }
    }
    if (suggestedVnum !== null) {
      break;
    }
  }

  const vnumNumber = Number(vnumInput);
  const isValid =
    vnumInput !== "" &&
    Number.isInteger(vnumNumber) &&
    vnumBlocks.some((b) => vnumNumber >= b.start && vnumNumber <= b.end) &&
    !existingVnums.has(vnumNumber);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isValid) {
      onCreate(vnumNumber);
    }
  };

  return (
    <div className="mb-4 rounded border border-zinc-700 bg-zinc-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Create at vnum</h3>
        <button
          className="text-xs text-zinc-500 hover:text-zinc-300"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>

      <form
        className="flex items-end gap-3"
        onSubmit={handleSubmit}
      >
        <div className="flex-1">
          <input
            className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400"
            onChange={(e) => {
              setVnumInput(e.target.value);
            }}
            placeholder={
              suggestedVnum === null
                ? "Enter vnum"
                : `Next available: ${String(suggestedVnum)}`
            }
            type="number"
            value={vnumInput}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Ranges:{" "}
            {vnumBlocks
              .map((b) => `${String(b.start)}-${String(b.end)}`)
              .join(", ")}
          </p>
        </div>
        <button
          className="rounded bg-zinc-600 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-500 disabled:opacity-50"
          disabled={!isValid}
          type="submit"
        >
          Create
        </button>
      </form>

      {vnumInput !== "" && !isValid ? (
        <p className="mt-2 text-xs text-red-400">
          {existingVnums.has(vnumNumber)
            ? "Already exists"
            : "Outside your assigned blocks"}
        </p>
      ) : null}
    </div>
  );
}
