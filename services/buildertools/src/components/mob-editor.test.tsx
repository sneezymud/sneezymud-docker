import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { Mob } from "@/shared/schemas/mob.ts";

import { Toaster } from "@/components/ui/sonner.tsx";
import { POWER } from "@/shared/powers.ts";
import {
  findFetchCall,
  makeMob,
  makeMobResponse,
  mockFetch,
  renderWithProviders,
  resetFetchMock,
  resetTestState,
  setTestAuth,
  waitForEditorReady,
  waitForSaveDisabled,
  waitForSaveEnabled,
} from "@/test-helpers-component.tsx";

import { MobEditor } from "./mob-editor.tsx";

const VNUM = "1000";
const BASE_POWERS = [POWER.BUILDER, POWER.MEDIT];

function mockMobEndpoints(mob?: Mob) {
  const mobBody = mob ?? makeMob();
  const responseBody = makeMobResponse();
  mockFetch([
    { body: mobBody, method: "GET", url: `/api/mobs/${VNUM}` },
    { body: mobBody, method: "PUT", url: `/api/mobs/${VNUM}` },
    { body: responseBody, method: "GET", url: `/api/mob-responses/${VNUM}` },
    { body: responseBody, method: "PUT", url: `/api/mob-responses/${VNUM}` },
  ]);
}

describe("MobEditor", () => {
  beforeEach(() => {
    setTestAuth(BASE_POWERS);
  });

  afterEach(resetTestState);

  describe("read-only mode", () => {
    beforeEach(() => {
      setTestAuth([POWER.BUILDER]);
    });

    test("renders ReadOnlyBanner when user lacks MEDIT", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      expect(await screen.findByText(/read[-\s]?only/i)).toBeDefined();
    });

    test("Save button absent in read-only mode", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    test("form inputs disabled in read-only mode", async () => {
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
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      // EntityHeader renders both mobile and desktop layouts with duplicate buttons
      const diffButtons = screen.getAllByRole("button", {
        name: /compare|diff/i,
      });
      expect(diffButtons.length).toBeGreaterThan(0);
    });

    test("Delete button absent in read-only mode", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    });

    test("Undo button absent in read-only mode", async () => {
      // Without a save path there is no need for an undo affordance, and a
      // visible Undo button in read-only mode would mislead users into
      // thinking the form is editable.
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    });
  });

  describe("dirty state tracking", () => {
    test("editing a field enables the Save button", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed mob keywords");

      return waitForSaveEnabled(saveButton);
    });

    test("reverting field to original value disables the Save button", async () => {
      const mob = makeMob({ name: "original keywords" });
      mockMobEndpoints(mob);
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "something different");

      await waitForSaveEnabled(saveButton);

      await user.clear(nameInput);
      await user.type(nameInput, "original keywords");

      return waitForSaveDisabled(saveButton);
    });
  });

  describe("MEDIT_IMP_POWER gates spec_proc options", () => {
    test("user without MEDIT_IMP_POWER cannot select unassignable spec procs", async () => {
      setTestAuth(BASE_POWERS);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      // spec_proc combobox is inside a collapsed accordion section but still in the DOM
      const specInput = screen.getByRole("combobox", {
        name: /special proc/i,
      });
      await user.type(specInput, "dragon");

      // "dragon breath" (value 3) is unassignable without MEDIT_IMP_POWER
      return waitFor(() => {
        expect(
          screen.queryByRole("option", { name: /dragon breath/ }),
        ).toBeNull();
      });
    });

    test("user with MEDIT_IMP_POWER can select unassignable spec procs", async () => {
      setTestAuth([...BASE_POWERS, POWER.MEDIT_IMP_POWER]);
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

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

    test("non-IMP_POWER user can save a mob with pre-existing unassignable spec_proc unchanged", async () => {
      // Mirror of the server-side unchanged-value pass-through test at the
      // component level. A non-IMP_POWER builder loads a mob whose spec_proc
      // was set to an unassignable value by an admin or senior; saving
      // without touching spec_proc must not trigger a client-side validation
      // error, since the field is not dirty.
      setTestAuth(BASE_POWERS); // no MEDIT_IMP_POWER
      mockMobEndpoints(makeMob({ spec_proc: 3 })); // 3 is unassignable
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "renamed but spec unchanged");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
      expect(putCall.body).toEqual(expect.objectContaining({ spec_proc: 3 }));
    });

    test("403 spec_proc rejection from server is surfaced via toast", async () => {
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

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "triggers a 403");

      resetFetchMock();
      mockFetch([
        {
          body: {
            error:
              'Changing "spec_proc" to an unassignable value requires POWER_MEDIT_IMP_POWER',
          },
          status: 403,
          url: `/api/mobs/${VNUM}`,
        },
        { body: makeMobResponse(), url: `/api/mob-responses/${VNUM}` },
      ]);

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      return waitFor(() => {
        expect(
          screen.getByText(/requires POWER_MEDIT_IMP_POWER/),
        ).toBeDefined();
      });
    });
  });

  describe("client-side validation", () => {
    test("clearing a required field and saving shows validation error", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);

      const saveButton = screen.getByRole("button", { name: "Save" });

      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      return waitFor(() => {
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

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed mob keywords");

      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      return waitForSaveDisabled(saveButton);
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

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

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

      return waitFor(() => {
        expect(screen.getByText("Some validation error")).toBeDefined();
      });
    });

    test("save sends correct payload shape", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "payload test mob");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
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

      await waitForEditorReady("Keywords");

      const addButton = screen.getByRole("button", {
        name: /add mobile string/i,
      });
      await user.click(addButton);

      const messageTextarea = await screen.findByLabelText("Message");
      await user.type(messageTextarea, "The mob enters the world.");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
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

      await waitForEditorReady("Keywords");

      const addButton = screen.getByRole("button", {
        name: /add immunities/i,
      });
      await user.click(addButton);

      const amountInput = await screen.findByLabelText("Amount");
      await user.clear(amountInput);
      await user.type(amountInput, "50");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
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

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "changed mob name");

      await waitForSaveEnabled(saveButton);

      const undoButton = screen.getByRole("button", { name: "Undo" });
      await user.click(undoButton);

      await waitFor(() => {
        expect(nameInput.getAttribute("value")).toBe("original mob name");
      });

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

      await waitForEditorReady("Keywords");

      await waitFor(() => {
        expect(screen.getByDisplayValue("A flash of light.")).toBeDefined();
      });

      const removeButton = screen.getByRole("button", {
        name: /remove enter world string/i,
      });
      await user.click(removeButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Remove",
      });
      await user.click(confirmButton);

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
      expect(putCall.url).toContain(`/api/mobs/${VNUM}`);
      expect(putCall.body).toEqual(expect.objectContaining({ extras: [] }));
    });
  });

  describe("delete flow", () => {
    test("delete button triggers confirmation dialog", async () => {
      mockMobEndpoints();
      renderWithProviders(<MobEditor vnumParam={VNUM} />);

      await waitForEditorReady("Keywords");

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      const user = userEvent.setup();
      await user.click(deleteButton);

      return waitFor(() => {
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

      await waitForEditorReady("Keywords");

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

      const deleteCall = findFetchCall("DELETE");
      expect(deleteCall.url).toContain(`/api/mobs/${VNUM}`);
    });
  });

  describe("network errors", () => {
    test("failed entity fetch shows error state", () => {
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
      return waitFor(() => {
        expect(screen.getByRole("alert")).toBeDefined();
      });
    });
  });
});
