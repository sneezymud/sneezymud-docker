import { describe, expect, test } from "bun:test";

import { deriveMobLetterAndPos } from "./mob-derived.ts";

describe("deriveMobLetterAndPos", () => {
  test("local_sound set + adjacent_sound empty -> letter A", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "",
        def_position: 9,
        local_sound: "a faint hum",
      }),
    ).toEqual({ letter: "A", pos: 9 });
  });

  test("local_sound set + adjacent_sound set -> letter L", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "distant drums",
        def_position: 9,
        local_sound: "a faint hum",
      }),
    ).toEqual({ letter: "L", pos: 9 });
  });

  test("local_sound empty + adjacent_sound empty -> letter L", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "",
        def_position: 9,
        local_sound: "",
      }),
    ).toEqual({ letter: "L", pos: 9 });
  });

  test("local_sound null + adjacent_sound null -> letter L", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: null,
        def_position: 9,
        local_sound: null,
      }),
    ).toEqual({ letter: "L", pos: 9 });
  });

  test("local_sound set + adjacent_sound null -> letter A", () => {
    // null is falsy, so this matches the "local only" branch
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: null,
        def_position: 9,
        local_sound: "echo",
      }),
    ).toEqual({ letter: "A", pos: 9 });
  });

  test("def_position passes through unchanged", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "",
        def_position: 0,
        local_sound: "",
      }).pos,
    ).toBe(0);
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "",
        def_position: 12,
        local_sound: "",
      }).pos,
    ).toBe(12);
  });
});
