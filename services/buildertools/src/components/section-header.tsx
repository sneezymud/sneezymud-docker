import { FieldTooltip } from "./info-tooltip.tsx";

export function SectionHeader({
  action,
  title,
  tooltip,
}: {
  action?: React.ReactNode;
  title: string;
  tooltip?: React.ReactNode;
}) {
  return (
    <>
      <legend className="sr-only">{title}</legend>

      <div className="text-muted-foreground sm:text-foreground mb-3 flex items-center gap-2 text-xs font-medium tracking-wider uppercase sm:text-lg sm:font-semibold sm:tracking-normal sm:normal-case">
        <span>{title}</span>
        {tooltip ? <FieldTooltip label={title}>{tooltip}</FieldTooltip> : null}
        {action}
      </div>
    </>
  );
}
