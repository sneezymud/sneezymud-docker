import { Fragment } from "react";

import type {
  FieldDef,
  FieldGroupDef,
} from "@/components/entity-form-types.ts";

import { Separator } from "@/components/ui/separator.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

import { FormField } from "./form-field.tsx";
import { FieldTooltip } from "./info-tooltip.tsx";

interface EntityFormProps {
  children?: React.ReactNode;
  groups: FieldGroupDef[];
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  values: Record<string, number | string>;
}

export function EntityForm({
  children,
  groups,
  onChange,
  originalValues,
  values,
}: EntityFormProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <div className="3xl:grid-cols-3 grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <FieldGroup
              colSpan={group.colSpan}
              detailedTooltip={group.detailedTooltip}
              fieldGroupSize={group.fieldGroupSize}
              fields={group.fields}
              gridCols={group.gridCols}
              header={group.header}
              key={group.title}
              labelClass={group.labelClass}
              onChange={onChange}
              originalValues={originalValues}
              title={group.title}
              tooltip={group.tooltip}
              values={values}
            />
          ))}
        </div>

        {children}
      </div>
    </TooltipProvider>
  );
}

function FieldGroup({
  colSpan,
  detailedTooltip,
  fieldGroupSize,
  fields,
  gridCols: _gridCols,
  header,
  labelClass: _labelClass,
  onChange,
  originalValues,
  title,
  tooltip,
  values,
}: {
  colSpan?: "full" | undefined;
  detailedTooltip?: React.ReactNode;
  fieldGroupSize?: number | undefined;
  fields: FieldDef[];
  gridCols?: string | undefined;
  header?: React.ReactNode;
  labelClass?: string | undefined;
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  title: string;
  tooltip?: React.ReactNode;
  values: Record<string, number | string>;
}) {
  const allCompact = fields.every(
    (f) => !(f.fullWidth ?? (f.type === "textarea" || f.type === "bitfield")),
  );
  const multiColumn = allCompact && fields.length > 1;

  return (
    <fieldset
      className={cn(
        "bg-card border-border/50 rounded-lg border p-5",
        colSpan === "full" && "col-span-full",
      )}
    >
      <legend className="text-foreground text-lg font-semibold">
        {title}
        {tooltip || detailedTooltip ? (
          <FieldTooltip
            detailedTooltip={detailedTooltip}
            label={title}
          >
            {tooltip}
          </FieldTooltip>
        ) : null}
      </legend>
      {header}
      <div
        className={cn(
          "grid grid-cols-[auto_auto_1.5rem] gap-x-3 gap-y-2",
          multiColumn &&
            "sm:grid-flow-col sm:grid-cols-[auto_auto_1.5rem_auto_auto_1.5rem]",
        )}
        style={
          multiColumn
            ? {
                gridTemplateRows: `repeat(${Math.ceil(fields.length / 2)}, auto)`,
              }
            : undefined
        }
      >
        {fields.map((field, i) => {
          const fieldDirty =
            originalValues !== undefined &&
            values[field.key] !== originalValues[field.key];
          const showSeparator =
            !multiColumn &&
            fieldGroupSize !== undefined &&
            i > 0 &&
            i % fieldGroupSize === 0;
          return (
            <Fragment key={field.key}>
              {showSeparator ? <Separator className="col-span-full" /> : null}
              <FormField
                field={field}
                isDirty={fieldDirty}
                onChange={onChange}
                value={values[field.key]}
              />
            </Fragment>
          );
        })}
      </div>
    </fieldset>
  );
}

export {
  type FieldDef,
  type FieldGroupDef,
} from "@/components/entity-form-types.ts";
