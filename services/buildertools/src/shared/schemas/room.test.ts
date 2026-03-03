import { describe, expect, test } from "bun:test";

import { roomExitSchema } from "./room.ts";

describe("roomExitSchema key_num", () => {
  const validExit = {
    block: 1,
    condition_flag: 0,
    description: "",
    destination: 100,
    direction: 0,
    lock_difficulty: 0,
    name: "",
    type: 0,
    vnum: 100,
    weight: 0,
  };

  test("accepts -1 (no key)", () => {
    const result = roomExitSchema.safeParse({ ...validExit, key_num: -1 });
    expect(result.success).toBe(true);
  });

  test("accepts positive object vnum", () => {
    const result = roomExitSchema.safeParse({ ...validExit, key_num: 500 });
    expect(result.success).toBe(true);
  });

  test("rejects 0 - ambiguous between no-key and vnum 0", () => {
    const result = roomExitSchema.safeParse({ ...validExit, key_num: 0 });
    expect(result.success).toBe(false);
  });
});
