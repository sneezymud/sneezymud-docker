import type { VnumBlock } from "@/shared/schemas/auth.ts";

export function isVnumInBlocks(vnum: number, blocks: VnumBlock[]): boolean {
  return blocks.some((block) => vnum >= block.start && vnum <= block.end);
}

export function getAllVnumsInBlocks(blocks: VnumBlock[]): number[] {
  const vnums: number[] = [];
  for (const block of blocks) {
    for (let v = block.start; v <= block.end; v++) {
      vnums.push(v);
    }
  }
  return vnums;
}

export function findNextAvailableVnum(
  blocks: VnumBlock[],
  existingVnums: Set<number>,
): null | number {
  for (const block of blocks) {
    for (let v = block.start; v <= block.end; v++) {
      if (!existingVnums.has(v)) {
        return v;
      }
    }
  }
  return null;
}
