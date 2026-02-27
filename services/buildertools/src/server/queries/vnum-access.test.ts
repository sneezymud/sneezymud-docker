import { describe, expect, test } from "bun:test";

import {
  findNextAvailableVnum,
  getAllVnumsInBlocks,
  isVnumInBlocks,
} from "./vnum-access.ts";

describe("isVnumInBlocks", () => {
  const blocks = [
    { end: 199, start: 100 },
    { end: 399, start: 300 },
  ];

  test("accepts vnum at start of block", () => {
    expect(isVnumInBlocks(100, blocks)).toBe(true);
  });

  test("accepts vnum at end of block", () => {
    expect(isVnumInBlocks(199, blocks)).toBe(true);
  });

  test("accepts vnum in middle of block", () => {
    expect(isVnumInBlocks(150, blocks)).toBe(true);
  });

  test("accepts vnum in second block", () => {
    expect(isVnumInBlocks(350, blocks)).toBe(true);
  });

  test("rejects vnum just below block", () => {
    expect(isVnumInBlocks(99, blocks)).toBe(false);
  });

  test("rejects vnum just above block", () => {
    expect(isVnumInBlocks(200, blocks)).toBe(false);
  });

  test("rejects vnum between blocks", () => {
    expect(isVnumInBlocks(250, blocks)).toBe(false);
  });

  test("rejects any vnum with empty blocks", () => {
    expect(isVnumInBlocks(100, [])).toBe(false);
  });
});

describe("findNextAvailableVnum", () => {
  const blocks = [
    { end: 102, start: 100 },
    { end: 202, start: 200 },
  ];

  test("returns first vnum when none are taken", () => {
    expect(findNextAvailableVnum(blocks, new Set())).toBe(100);
  });

  test("skips taken vnums", () => {
    expect(findNextAvailableVnum(blocks, new Set([100, 101]))).toBe(102);
  });

  test("moves to next block when first is exhausted", () => {
    expect(findNextAvailableVnum(blocks, new Set([100, 101, 102]))).toBe(200);
  });

  test("returns null when all vnums are taken", () => {
    const allTaken = new Set([100, 101, 102, 200, 201, 202]);
    expect(findNextAvailableVnum(blocks, allTaken)).toBeNull();
  });

  test("returns null with empty blocks", () => {
    expect(findNextAvailableVnum([], new Set())).toBeNull();
  });
});

describe("getAllVnumsInBlocks", () => {
  test("returns all vnums in a single block", () => {
    expect(getAllVnumsInBlocks([{ end: 102, start: 100 }])).toEqual([
      100, 101, 102,
    ]);
  });

  test("returns vnums across multiple blocks", () => {
    const blocks = [
      { end: 101, start: 100 },
      { end: 201, start: 200 },
    ];
    expect(getAllVnumsInBlocks(blocks)).toEqual([100, 101, 200, 201]);
  });

  test("returns empty array with no blocks", () => {
    expect(getAllVnumsInBlocks([])).toEqual([]);
  });
});
