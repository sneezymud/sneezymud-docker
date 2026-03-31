import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { Obj } from "@/shared/schemas/obj.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { ObjectEditor } from "./object-editor.tsx";

/** Minimal valid Obj for API mock responses. Override fields as needed. */
function makeObj(overrides: Partial<Obj> = {}): Obj {
  return {
    action_desc: "",
    action_flag: 0,
    affects: [],
    can_be_seen: 0,
    cur_struct: 100,
    decay: -1,
    extras: [],
    long_desc: "A test object lies here.",
    material: 0,
    max_exist: 9999,
    max_struct: 100,
    name: "test object",
    price: 500,
    short_desc: "a test object",
    spec_proc: 0,
    type: 0,
    val0: 0,
    val1: 0,
    val2: 0,
    val3: 0,
    vnum: 1000,
    volume: 100,
    wear_flag: 0,
    weight: 5,
    ...overrides,
  };
}

/** Set auth store with given powers and standard user fields. */
function setAuth(powers: number[]) {
  useAuthStore.setState({
    user: {
      blocks: [{ end: 1099, start: 1000 }],
      playerName: "TestBuilder",
      powers,
      username: "testbuilder",
    },
  });
}

const VNUM = "1000";
const BASE_POWERS = [POWER.BUILDER, POWER.OEDIT];

describe("ObjectEditor", () => {
  afterEach(() => {
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  describe("type-specific field rendering", () => {
    beforeEach(() => {
      setAuth([...BASE_POWERS, POWER.OEDIT_WEAPONS]);
    });

    test("weapon type renders Current Sharpness and Max Sharpness fields", async () => {
      const weaponObj = makeObj({ type: 5, val0: 0x80_50 });
      mockFetch([{ body: weaponObj, url: `/api/objects/${VNUM}` }]);

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Current Sharpness")).toBeDefined();
      });
      expect(screen.getByText("Max Sharpness")).toBeDefined();
      expect(screen.getByText("Damage Level")).toBeDefined();
      expect(screen.getByText("Damage Deviation")).toBeDefined();
    });

    test("container type renders Weight Capacity and Container Flags fields", async () => {
      const containerObj = makeObj({ type: 15, val0: 100, val1: 3 });
      mockFetch([{ body: containerObj, url: `/api/objects/${VNUM}` }]);

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Weight Capacity")).toBeDefined();
      });
      expect(screen.getByText("Container Flags")).toBeDefined();
      expect(screen.getByText("Volume Capacity")).toBeDefined();
    });

    test("type with no spec fields renders only common fields", async () => {
      // Type 18 (Key) has an empty fields array in OBJ_TYPE_SPECS
      const keyObj = makeObj({ type: 18 });
      mockFetch([{ body: keyObj, url: `/api/objects/${VNUM}` }]);

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Common fields are present
      expect(screen.getByText("Price")).toBeDefined();
      expect(screen.getByText("Weight")).toBeDefined();

      // Type-specific weapon/container fields are absent
      expect(screen.queryByText("Current Sharpness")).toBeNull();
      expect(screen.queryByText("Weight Capacity")).toBeNull();
      // Generic fallback values (Value 0-3) also absent for known type with empty spec
      expect(screen.queryByText("Value 0")).toBeNull();
    });
  });

  describe("OEDIT_COST power gates price field", () => {
    test("user without OEDIT_COST sees price input as disabled", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Price")).toBeDefined();
      });

      const priceInput = screen.getByRole("spinbutton", { name: "Price" });
      expect(priceInput.hasAttribute("disabled")).toBe(true);
    });

    test("user with OEDIT_COST sees price input as enabled", async () => {
      setAuth([...BASE_POWERS, POWER.OEDIT_COST]);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Price")).toBeDefined();
      });

      const priceInput = screen.getByRole("spinbutton", { name: "Price" });
      expect(priceInput.hasAttribute("disabled")).toBe(false);
    });
  });
});
