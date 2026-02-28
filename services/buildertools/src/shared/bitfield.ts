// Bitfield manipulation utilities for signed 32-bit integer columns.
// Uses bitwise operators (>>> and ^) which correctly handle negative values
// from signed INT DB columns, unlike division/modulo which breaks on negatives.

export function hasBit(value: number, bit: number): boolean {
  return ((value >>> bit) & 1) === 1;
}

export function toggleBit(value: number, bit: number): number {
  return value ^ (1 << bit);
}
