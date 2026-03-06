import type { ColumnDef } from "@/components/sub-table.tsx";
import type { ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { BitfieldEditor } from "@/components/bitfield-editor.tsx";
import { EnumSelect } from "@/components/enum-select.tsx";
import { HelpTip } from "@/components/help-tip.tsx";
import { NumberInput } from "@/components/number-input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { getApplyTypeSpec } from "@/shared/apply-type-specs.ts";
import { hasBit } from "@/shared/bitfield.ts";
import { APPLY_TYPES } from "@/shared/enums/index.ts";

export const affectColumns: Array<ColumnDef<ObjAffect>> = [
  {
    key: "type",
    label: "Apply Type",
    renderCell: (row, _onChange, { id, onRowChange }) => (
      <EnumSelect
        entries={APPLY_TYPES}
        id={id}
        onChange={(v) => {
          onRowChange({ mod1: 0, mod2: 0, type: v } as Partial<ObjAffect>);
        }}
        value={row.type}
      />
    ),
    type: "custom",
    width: "200px",
  },
  {
    key: "mod1",
    label: "Modifier",
    renderCell: (row, onChange, { id }) => {
      const spec = getApplyTypeSpec(row.type);
      if (!spec) {
        return (
          <NumberInput
            className="px-2 py-1"
            id={id}
            onValueChange={onChange}
            value={row.mod1}
          />
        );
      }
      const label = (
        <span className="text-muted-foreground mb-0.5 block text-xs">
          {spec.mod1.label}
          {spec.mod1.help ? (
            <>
              {" "}
              <HelpTip text={spec.mod1.help} />
            </>
          ) : null}
        </span>
      );
      if (spec.mod1.inputType === "enum" && spec.mod1.enumEntries) {
        return (
          <>
            {label}
            <EnumSelect
              entries={spec.mod1.enumEntries}
              id={id}
              onChange={onChange}
              value={row.mod1}
            />
          </>
        );
      }
      if (spec.mod1.inputType === "bitfield" && spec.mod1.bitfieldEntries) {
        const entries = spec.mod1.bitfieldEntries;
        const count = entries.filter((e) => hasBit(row.mod1, e.bit)).length;
        return (
          <>
            {label}
            <Popover>
              <PopoverTrigger
                aria-label={`${spec.mod1.label}: ${count} selected`}
                className="hover:bg-accent dark:bg-input/40 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 py-1 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              >
                {count > 0
                  ? `${count} effect${count === 1 ? "" : "s"}`
                  : "None"}
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-80 w-96 overflow-y-auto"
              >
                <p className="text-foreground mb-2 text-sm font-medium">
                  {spec.mod1.label}
                </p>
                <BitfieldEditor
                  entries={entries}
                  onChange={onChange}
                  value={row.mod1}
                />
              </PopoverContent>
            </Popover>
          </>
        );
      }
      return (
        <>
          {label}
          <NumberInput
            className="px-2 py-1"
            id={id}
            max={spec.mod1.max}
            min={spec.mod1.min}
            onValueChange={onChange}
            value={row.mod1}
          />
        </>
      );
    },
    type: "custom",
    width: "200px",
  },
  {
    key: "mod2",
    label: "Modifier 2",
    renderCell: (row, onChange, { id }) => {
      const spec = getApplyTypeSpec(row.type);
      if (!spec?.mod2) {
        if (spec) {
          return (
            <span className="text-muted-foreground/50 block pt-1 text-sm">
              --
            </span>
          );
        }
        return (
          <NumberInput
            className="px-2 py-1"
            id={id}
            onValueChange={onChange}
            value={row.mod2}
          />
        );
      }
      return (
        <>
          <span className="text-muted-foreground mb-0.5 block text-xs">
            {spec.mod2.label}
            {spec.mod2.help ? (
              <>
                {" "}
                <HelpTip text={spec.mod2.help} />
              </>
            ) : null}
          </span>
          <NumberInput
            className="px-2 py-1"
            id={id}
            max={spec.mod2.max}
            min={spec.mod2.min}
            onValueChange={onChange}
            value={row.mod2}
          />
        </>
      );
    },
    type: "custom",
    width: "120px",
  },
];

export const extraColumns: Array<ColumnDef<ObjExtra>> = [
  { key: "name", label: "Keywords", type: "tags", width: "250px" },
  { key: "description", label: "Description", type: "textarea", width: "1fr" },
];
