import { describe, expect, test } from "bun:test";

import { mobInputSchema } from "./mob.ts";

// Minimal valid payload for boundary tests. Every mid-range value here is
// deliberately inside its constraint so the test only exercises the specific
// field being flexed.
const baseValidMob = {
  ac: 10,
  actions: 0,
  adjacent_sound: "",
  affects: 0,
  agi: 0,
  attacks: 1,
  bra: 0,
  can_be_seen: 0,
  cha: 0,
  class: 0,
  con: 0,
  damage_level: 0,
  damage_precision: 0,
  def_position: 9,
  description: "A test mob.",
  dex: 0,
  extras: [],
  fact_perc: 0,
  faction: 0,
  foc: 0,
  gold: 0,
  height: 0,
  hpbonus: 0,
  immunities: [],
  intel: 0,
  kar: 0,
  level: 1,
  local_sound: "",
  long_desc: "A test mob stands here.",
  max_exist: 0,
  name: "test mob",
  per: 0,
  race: 0,
  sex: 0,
  short_desc: "a test mob",
  skin: 0,
  spe: 0,
  spec_proc: 0,
  str: 0,
  tohit: 0,
  vision: 0,
  vnum: 100,
  weight: 0,
  wis: 0,
};

// Each constraint family has one representative field. The others in the
// family share the same min/max and are validated by the same underlying
// Zod constraint, so exercising each representative covers the family.
describe("mobInputSchema boundary values", () => {
  describe("stat family (-25..25)", () => {
    test("accepts str = -25 at min boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, str: -25 }).success,
      ).toBe(true);
    });

    test("accepts str = 25 at max boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, str: 25 }).success,
      ).toBe(true);
    });

    test("rejects str = -26 one below min", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, str: -26 }).success,
      ).toBe(false);
    });

    test("rejects str = 26 one above max", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, str: 26 }).success,
      ).toBe(false);
    });
  });

  describe("level (1..100)", () => {
    test("accepts level = 1 at min boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, level: 1 }).success,
      ).toBe(true);
    });

    test("accepts level = 100 at max boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, level: 100 }).success,
      ).toBe(true);
    });

    test("rejects level = 0 one below min", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, level: 0 }).success,
      ).toBe(false);
    });

    test("rejects level = 101 one above max", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, level: 101 }).success,
      ).toBe(false);
    });
  });

  describe("ac / damage_level / hpbonus (0..127)", () => {
    test("accepts ac = 0 at min boundary", () => {
      expect(mobInputSchema.safeParse({ ...baseValidMob, ac: 0 }).success).toBe(
        true,
      );
    });

    test("accepts ac = 127 at max boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, ac: 127 }).success,
      ).toBe(true);
    });

    test("rejects ac = -1 one below min", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, ac: -1 }).success,
      ).toBe(false);
    });

    test("rejects ac = 128 one above max", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, ac: 128 }).success,
      ).toBe(false);
    });
  });

  describe("max_exist (0..9999)", () => {
    test("accepts max_exist = 0 at min boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, max_exist: 0 }).success,
      ).toBe(true);
    });

    test("accepts max_exist = 9999 at max boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, max_exist: 9999 }).success,
      ).toBe(true);
    });

    test("rejects max_exist = 10000 one above max", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, max_exist: 10_000 })
          .success,
      ).toBe(false);
    });
  });

  describe("actions (0..UINT32_MAX)", () => {
    test("accepts actions = 0 at min boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, actions: 0 }).success,
      ).toBe(true);
    });

    test("accepts actions = UINT32_MAX at max boundary", () => {
      expect(
        mobInputSchema.safeParse({
          ...baseValidMob,
          actions: 4_294_967_295,
        }).success,
      ).toBe(true);
    });

    test("rejects actions = UINT32_MAX + 1 one above max", () => {
      expect(
        mobInputSchema.safeParse({
          ...baseValidMob,
          actions: 4_294_967_296,
        }).success,
      ).toBe(false);
    });

    test("rejects actions = -1 one below min", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, actions: -1 }).success,
      ).toBe(false);
    });
  });

  describe("spec_proc (0..222)", () => {
    test("accepts spec_proc = 0 at min boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, spec_proc: 0 }).success,
      ).toBe(true);
    });

    test("accepts spec_proc = 222 at max boundary", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, spec_proc: 222 }).success,
      ).toBe(true);
    });

    test("rejects spec_proc = 223 one above max", () => {
      expect(
        mobInputSchema.safeParse({ ...baseValidMob, spec_proc: 223 }).success,
      ).toBe(false);
    });
  });
});
