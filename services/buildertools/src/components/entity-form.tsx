import { Fragment } from "react";

import type { FieldGroupDef } from "@/shared/types/entity-form.ts";

import { Separator } from "@/components/ui/separator.tsx";
import { cn } from "@/lib/utils.ts";

import { FormField } from "./form-field.tsx";
import { SectionHeader } from "./section-header.tsx";

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
    <div className="space-y-6">
      {groups.map((group) => (
        <FieldGroup
          group={group}
          key={group.title}
          onChange={onChange}
          originalValues={originalValues}
          values={values}
        />
      ))}

      {children}
    </div>
  );
}

function FieldGroup({
  group,
  onChange,
  originalValues,
  values,
}: {
  group: FieldGroupDef;
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  values: Record<string, number | string>;
}) {
  const {
    colSpan,
    detailedTooltip,
    fieldGroupSize,
    fields,
    header,
    title,
    tooltip,
  } = group;

  return (
    <fieldset className={cn("p-1", colSpan === "full" && "col-span-full")}>
      <SectionHeader
        detailedTooltip={detailedTooltip}
        title={title}
        tooltip={tooltip}
      />

      {header}

      <div className="grid grid-cols-1 gap-y-4">
        {fields.map((field, i) => {
          const fieldDirty =
            originalValues !== undefined &&
            values[field.key] !== originalValues[field.key];
          const showSeparator =
            fieldGroupSize !== undefined && i > 0 && i % fieldGroupSize === 0;
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
