import { describe, expect, test } from "bun:test";

import { deriveMobLetterAndPos } from "./mob-derived.ts";

describe("deriveMobLetterAndPos", () => {
  test("pos always equals def_position", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "",
        def_position: 5,
        local_sound: "",
      }).pos,
    ).toBe(5);
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "x",
        def_position: 9,
        local_sound: "y",
      }).pos,
    ).toBe(9);
  });

  test("letter is 'A' when local_sound is truthy and adjacent_sound is falsy", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "",
        def_position: 0,
        local_sound: "howling",
      }).letter,
    ).toBe("A");
  });

  test("letter is 'L' when both sounds are truthy", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "roaring",
        def_position: 0,
        local_sound: "howling",
      }).letter,
    ).toBe("L");
  });

  test("letter is 'L' when only adjacent_sound is truthy", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "roaring",
        def_position: 0,
        local_sound: "",
      }).letter,
    ).toBe("L");
  });

  test("letter is 'L' when both sounds are empty", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "",
        def_position: 0,
        local_sound: "",
      }).letter,
    ).toBe("L");
  });

  test("null sound fields are treated as falsy (letter='L')", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: null,
        def_position: 0,
        local_sound: null,
      }).letter,
    ).toBe("L");
  });

  test("null local_sound with adjacent_sound yields 'L'", () => {
    expect(
      deriveMobLetterAndPos({
        adjacent_sound: "roaring",
        def_position: 0,
        local_sound: null,
      }).letter,
    ).toBe("L");
  });
});
