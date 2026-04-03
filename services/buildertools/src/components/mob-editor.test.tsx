// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { MobResponse } from "@/shared/schemas/mob-response.ts";
import type { Mob } from "@/shared/schemas/mob.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { MobEditor } from "./mob-editor.tsx";

/** Minimal valid Mob for API mock responses. Override fields as needed. */
function makeMob(overrides: Partial<Mob> = {}): Mob {
  return {
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
    damage_level: 1,
    damage_precision: 50,
    def_position: 8,
    description: "A test mob stands here looking menacing.",
    dex: 0,
    extras: [],
    fact_perc: 0,
    faction: 0,
    foc: 0,
    gold: 1,
    height: 72,
    hpbonus: 1,
    immunities: [],
    intel: 0,
    kar: 0,
    level: 10,
    local_sound: "",
    long_desc: "A test mob stands here.",
    max_exist: 9999,
    name: "test mob keywords",
    per: 0,
    race: 0,
    sex: 1,
    short_desc: "a test mob",
    skin: 0,
    spe: 0,
    spec_proc: 0,
    str: 0,
    tohit: 0,
    vision: 0,
    vnum: 1000,
    weight: 150,
    wis: 0,
    ...overrides,
  };
}

function makeMobResponse(overrides: Partial<MobResponse> = {}): MobResponse {
  return { response: "", vnum: 1000, ...overrides };
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
const BASE_POWERS = [POWER.BUILDER, POWER.MEDIT];

function mockMobEndpoints(mob?: Mob, response?: MobResponse) {
  mockFetch([
    { body: mob ?? makeMob(), url: `/api/mobs/${VNUM}` },
    { body: response ?? makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
  ]);
}

describe("MobEditor", () => {
  beforeEach(() => {
    setAuth(BASE_POWERS);
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  describe("dirty state tracking", () => {
    test("editing a field enables the Save button", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      // Wait for the form to load
      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Save button should be disabled initially (no edits)
      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      // Edit the Keywords field (mob name)
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed mob keywords");

      // Save button should now be enabled
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });
    });

    test("reverting field to original value disables the Save button", async () => {
      const mob = makeMob({ name: "original keywords" });
      mockMobEndpoints(mob);
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      // Edit the field to make it dirty
      await user.clear(nameInput);
      await user.type(nameInput, "something different");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Revert to the original value
      await user.clear(nameInput);
      await user.type(nameInput, "original keywords");

      // Save button should be disabled again - no real changes
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });
    });
  });

  describe("MEDIT_IMP_POWER gates spec_proc options", () => {
    test("user without MEDIT_IMP_POWER cannot select unassignable spec procs", async () => {
      setAuth(BASE_POWERS);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // spec_proc combobox input (in collapsed section but still in DOM)
      const specInput = screen.getByRole("combobox", {
        name: /special proc/i,
      });
      await user.type(specInput, "dragon");

      // "dragon breath" (value 3) is unassignable without MEDIT_IMP_POWER
      await waitFor(() => {
        expect(
          screen.queryByRole("option", { name: /dragon breath/ }),
        ).toBeNull();
      });
    });

    test("user with MEDIT_IMP_POWER can select unassignable spec procs", async () => {
      setAuth([...BASE_POWERS, POWER.MEDIT_IMP_POWER]);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const specInput = screen.getByRole("combobox", {
        name: /special proc/i,
      });
      await user.type(specInput, "dragon");

      // "dragon breath" (value 3) should be available with MEDIT_IMP_POWER
      const option = await screen.findByRole("option", {
        name: /dragon breath/,
      });
      expect(option).toBeDefined();
    });
  });

  describe("client-side validation", () => {
    test("clearing a required field and saving shows validation error", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      // Clear the required Keywords field
      await user.clear(nameInput);

      const saveButton = screen.getByRole("button", { name: "Save" });

      // Save should be enabled (field is dirty)
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Click save to trigger validation
      await user.click(saveButton);

      // Validation error should appear for the Keywords field
      await waitFor(() => {
        expect(screen.getByText("Keywords is required")).toBeDefined();
      });
    });
  });
});
