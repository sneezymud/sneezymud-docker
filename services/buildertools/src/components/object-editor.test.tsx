// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      isSenior: false,
      playerId: 99_999,
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
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  describe("read-only mode", () => {
    beforeEach(() => {
      setAuth([POWER.BUILDER]);
    });

    test("TEST-RO-1: renders ReadOnlyBanner when user lacks OEDIT", async () => {
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      expect(await screen.findByText(/read[-\s]?only/i)).toBeDefined();
    });

    test("TEST-RO-2: Save button absent in read-only mode", async () => {
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    test("TEST-RO-3: form inputs disabled in read-only mode", async () => {
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      expect(
        nameInput.hasAttribute("disabled") ||
          nameInput.hasAttribute("readonly"),
      ).toBe(true);
    });

    test("TEST-RO-4: Applies sub-table Add/Remove buttons hidden when readOnly", async () => {
      const obj = makeObj({
        affects: [{ mod1: 0, mod2: 0, type: 0, vnum: 1000 }],
      });
      mockFetch([{ body: obj, url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      // Add button for applies should not be present
      expect(screen.queryByRole("button", { name: /add applies/i })).toBeNull();
      // Remove buttons should not be present
      expect(screen.queryByRole("button", { name: /remove row/i })).toBeNull();
    });

    test("TEST-RO-5: Diff button still accessible in read-only mode", async () => {
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      // EntityHeader renders both mobile and desktop layouts with duplicate buttons
      const diffButtons = screen.getAllByRole("button", {
        name: /compare|diff/i,
      });
      expect(diffButtons.length).toBeGreaterThan(0);
    });
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

  describe("type switch updates visible fields", () => {
    beforeEach(() => {
      setAuth([...BASE_POWERS, POWER.OEDIT_WEAPONS]);
    });

    test("switching from weapon to container replaces type-specific fields", async () => {
      const weaponObj = makeObj({ type: 5, val0: 0x80_50 });
      mockFetch([{ body: weaponObj, url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      // Weapon fields should be present initially
      await waitFor(() => {
        expect(screen.getByText("Current Sharpness")).toBeDefined();
      });

      // Find the Item Type combobox input and change to Container
      const typeInput = screen.getByRole("combobox", { name: /item type/i });
      await user.clear(typeInput);
      await user.type(typeInput, "Chest");

      // Select the Container option from the dropdown
      const option = await screen.findByRole("option", {
        name: /Chest\/Container/,
      });
      await user.click(option);

      // Container fields should appear, weapon fields should be gone
      await waitFor(() => {
        expect(screen.getByText("Weight Capacity")).toBeDefined();
      });
      expect(screen.queryByText("Current Sharpness")).toBeNull();
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
