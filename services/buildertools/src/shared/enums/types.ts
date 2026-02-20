export interface EnumEntry {
  label: string;
  value: number;
}

export interface BitfieldEntry {
  bit: number;
  /** Why this flag cannot be toggled in the UI (e.g., overflows the DB column) */
  disabledReason?: string;
  label: string;
  /** Plain-text tooltip describing the gameplay effect of this flag */
  tooltip?: string;
}
