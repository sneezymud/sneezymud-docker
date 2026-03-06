import type { BitfieldEntry, EnumEntry } from "@/shared/types/enums.ts";

export type FieldDef =
  | BitfieldFieldDef
  | EnumFieldDef
  | NumberFieldDef
  | RoomFieldDef
  | TextFieldDef;

export interface FieldGroupDef {
  colSpan?: "full";
  detailedTooltip?: React.ReactNode;
  fieldGroupSize?: number;
  fields: FieldDef[];
  gridCols?: string;
  header?: React.ReactNode;
  labelClass?: string | undefined;
  title: string;
  tooltip?: React.ReactNode;
}

interface FieldDefBase {
  addable?: boolean;
  detailedTooltip?: React.ReactNode;
  fullWidth?: boolean;
  help?: string;
  key: string;
  label: string;
  readOnly?: boolean;
  required?: boolean | undefined;
  tooltip?: React.ReactNode;
}

interface TextFieldDef extends FieldDefBase {
  type: "text" | "textarea";
}

interface NumberFieldDef extends FieldDefBase {
  max?: number;
  min?: number;
  step?: number;
  type: "number";
}

interface EnumFieldDef extends FieldDefBase {
  enumEntries: EnumEntry[];
  type: "enum";
}

interface BitfieldFieldDef extends FieldDefBase {
  bitfieldEntries: BitfieldEntry[];
  type: "bitfield";
}

interface RoomFieldDef extends FieldDefBase {
  type: "room";
}
