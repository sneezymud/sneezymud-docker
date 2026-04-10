// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { MobResponse } from "@/shared/schemas/mob-response.ts";
import type { Mob } from "@/shared/schemas/mob.ts";

import { Toaster } from "@/components/ui/sonner.tsx";
import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  getFetchLog,
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
  const m = mob ?? makeMob();
  const r = response ?? makeMobResponse();
  mockFetch([
    { body: m, method: "GET", url: `/api/mobs/${VNUM}` },
    { body: m, method: "PUT", url: `/api/mobs/${VNUM}` },
    { body: r, method: "GET", url: `/api/mob-responses/${VNUM}` },
    { body: r, method: "PUT", url: `/api/mob-responses/${VNUM}` },
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

  describe("read-only mode", () => {
    test("renders ReadOnlyBanner when user lacks MEDIT", async () => {
      setAuth([POWER.BUILDER]);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      expect(await screen.findByText(/read[-\s]?only/i)).toBeDefined();
    });

    test("Save button absent in read-only mode", async () => {
      setAuth([POWER.BUILDER]);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    test("form inputs disabled in read-only mode", async () => {
      setAuth([POWER.BUILDER]);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      expect(
        nameInput.hasAttribute("disabled") ||
          nameInput.hasAttribute("readonly"),
      ).toBe(true);
    });

    test("Diff button still accessible in read-only mode", async () => {
      setAuth([POWER.BUILDER]);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      // EntityHeader renders both mobile and desktop layouts with duplicate buttons
      const diffButtons = screen.getAllByRole("button", {
        name: /compare|diff/i,
      });
      expect(diffButtons.length).toBeGreaterThan(0);
    });
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

  describe("save flow", () => {
    test("successful save clears dirty state", async () => {
      const mob = makeMob();
      // mockFetch matches by URL substring, so the PUT response uses the same
      // handler as the GET. The saved mob data is returned for both.
      mockFetch([
        { body: mob, url: `/api/mobs/${VNUM}` },
        { body: makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
      ]);
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      // Edit Keywords to make dirty
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed mob keywords");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      // After successful save, dirty state clears and Save becomes disabled
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });
    });

    test("server validation error is surfaced", async () => {
      mockFetch([
        { body: makeMob(), url: `/api/mobs/${VNUM}` },
        { body: makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
      ]);
      renderWithProviders(
        <>
          <MobEditor vnumParam={VNUM} />
          <Toaster />
        </>,
      );
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Edit a field to enable Save
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Replace mock to return 400 for the save request
      resetFetchMock();
      mockFetch([
        {
          body: { error: "Some validation error" },
          status: 400,
          url: `/api/mobs/${VNUM}`,
        },
        { body: makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
      ]);

      await user.click(saveButton);

      // Error message surfaces via toast
      await waitFor(() => {
        expect(screen.getByText("Some validation error")).toBeDefined();
      });
    });

    test("save sends correct payload shape", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "payload test mob");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });

      const putCall = getFetchLog().find((c) => c.method === "PUT");
      if (!putCall) throw new Error("expected PUT call in fetch log");
      expect(putCall.url).toContain(`/api/mobs/${VNUM}`);

      expect(putCall.body).toEqual(
        expect.objectContaining({
          extras: [],
          immunities: [],
          level: 10,
          name: "payload test mob",
          race: 0,
          short_desc: "a test mob",
          vnum: 1000,
        }),
      );
    });

    test("adding a mobile string includes it in save payload", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Click "Add mobile string" button to add an extras row
      const addButton = screen.getByRole("button", {
        name: /add mobile string/i,
      });
      await user.click(addButton);

      // A new row should appear with a Message textarea - fill it in
      const messageTextarea = await screen.findByLabelText("Message");
      await user.type(messageTextarea, "The mob enters the world.");

      // Save button should be enabled (dirty state from extras change)
      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });

      const putCall = getFetchLog().find((c) => c.method === "PUT");
      if (!putCall) throw new Error("expected PUT call in fetch log");
      expect(putCall.url).toContain(`/api/mobs/${VNUM}`);
      expect(putCall.body).toEqual(
        expect.objectContaining({
          extras: [
            expect.objectContaining({
              description: "The mob enters the world.",
              keyword: "bamfin",
            }),
          ],
        }),
      );
    });

    test("adding an immunity includes it in save payload", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Click "Add immunities" button to add an immunities row
      const addButton = screen.getByRole("button", {
        name: /add immunities/i,
      });
      await user.click(addButton);

      // A new row should appear with Amount field - fill it in
      const amountInput = await screen.findByLabelText("Amount");
      await user.clear(amountInput);
      await user.type(amountInput, "50");

      // Save button should be enabled (dirty state from immunities change)
      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });

      const putCall = getFetchLog().find((c) => c.method === "PUT");
      if (!putCall) throw new Error("expected PUT call in fetch log");
      expect(putCall.url).toContain(`/api/mobs/${VNUM}`);
      expect(putCall.body).toEqual(
        expect.objectContaining({
          immunities: [expect.objectContaining({ amt: 50, type: 0 })],
        }),
      );
    });
  });

  describe("undo button", () => {
    test("clicking Undo reverts form and disables Save", async () => {
      const mob = makeMob({ name: "original mob name" });
      mockMobEndpoints(mob);
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      // Make the form dirty
      await user.clear(nameInput);
      await user.type(nameInput, "changed mob name");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Click the Undo button
      const undoButton = screen.getByRole("button", { name: "Undo" });
      await user.click(undoButton);

      // Form reverts to original value
      await waitFor(() => {
        expect(nameInput.getAttribute("value")).toBe("original mob name");
      });

      // Save button becomes disabled again
      expect(saveButton.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("sub-table row removal", () => {
    test("removing an extras row excludes it from save payload", async () => {
      const mob = makeMob({
        extras: [
          {
            description: "A flash of light.",
            keyword: "bamfin" as const,
            vnum: 1000,
          },
        ],
      });
      mockMobEndpoints(mob);
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Verify the extras row is displayed
      await waitFor(() => {
        expect(screen.getByDisplayValue("A flash of light.")).toBeDefined();
      });

      // Click the remove button for the Enter World string
      const removeButton = screen.getByRole("button", {
        name: /remove enter world string/i,
      });
      await user.click(removeButton);

      // Confirm the removal in the dialog
      const confirmButton = await screen.findByRole("button", {
        name: "Remove",
      });
      await user.click(confirmButton);

      // Save button should be enabled (dirty state from row removal)
      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });

      const putCall = getFetchLog().find((c) => c.method === "PUT");
      if (!putCall) throw new Error("expected PUT call in fetch log");
      expect(putCall.url).toContain(`/api/mobs/${VNUM}`);
      expect(putCall.body).toEqual(expect.objectContaining({ extras: [] }));
    });
  });

  describe("delete flow", () => {
    test("delete button triggers confirmation dialog", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      const user = userEvent.setup();
      await user.click(deleteButton);

      // Confirm dialog appears with the confirm button
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Yes, delete" }),
        ).toBeDefined();
      });
    });

    test("confirming delete calls the API", async () => {
      mockFetch([
        { body: makeMob(), url: `/api/mobs/${VNUM}` },
        { body: makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
      ]);
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Replace mock to add a DELETE handler (same URL, returns { ok: true })
      resetFetchMock();
      mockFetch([
        { body: { ok: true }, url: `/api/mobs/${VNUM}` },
        { body: makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
      ]);

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      await user.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, delete",
      });
      await user.click(confirmButton);

      // Successful delete navigates to /mobs list page. Our test router only
      // has a root route, so the navigation produces "Not Found" - confirming
      // the delete API call succeeded and triggered the redirect.
      await waitFor(() => {
        expect(screen.getByText("Not Found")).toBeDefined();
      });

      // Verify the DELETE request was sent to the correct URL
      const deleteCall = getFetchLog().find((c) => c.method === "DELETE");
      if (!deleteCall) throw new Error("expected DELETE call in fetch log");
      expect(deleteCall.url).toContain(`/api/mobs/${VNUM}`);
    });
  });

  describe("network errors", () => {
    test("failed entity fetch shows error state", async () => {
      mockFetch([
        {
          body: { error: "Internal server error" },
          status: 500,
          url: `/api/mobs/${VNUM}`,
        },
        { body: makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
      ]);
      renderWithProviders(<MobEditor vnumParam={VNUM} />);

      // QueryStatus renders an Alert with role="alert" on fetch failure
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeDefined();
      });
    });
  });
});
