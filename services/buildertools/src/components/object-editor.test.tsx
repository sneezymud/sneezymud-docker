// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { Obj } from "@/shared/schemas/obj.ts";

import { Toaster } from "@/components/ui/sonner.tsx";
import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  getFetchLog,
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

function mockObjEndpoints(overrides: Partial<Obj> = {}) {
  const obj = makeObj(overrides);
  mockFetch([
    { body: obj, method: "GET", url: `/api/objects/${VNUM}` },
    { body: obj, method: "PUT", url: `/api/objects/${VNUM}` },
  ]);
}

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

    test("renders ReadOnlyBanner when user lacks OEDIT", async () => {
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      expect(await screen.findByText(/read[-\s]?only/i)).toBeDefined();
    });

    test("Save button absent in read-only mode", async () => {
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    test("form inputs disabled in read-only mode", async () => {
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      expect(
        nameInput.hasAttribute("disabled") ||
          nameInput.hasAttribute("readonly"),
      ).toBe(true);
    });

    test("Applies sub-table Add/Remove buttons hidden when readOnly", async () => {
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

    test("Diff button still accessible in read-only mode", async () => {
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

  describe("dirty state tracking", () => {
    test("editing a field enables the Save button", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed object keywords");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });
    });

    test("reverting field to original value disables the Save button", async () => {
      setAuth(BASE_POWERS);
      const obj = makeObj({ name: "original keywords" });
      mockFetch([{ body: obj, url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "something different");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.clear(nameInput);
      await user.type(nameInput, "original keywords");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });
    });
  });

  describe("client-side validation", () => {
    test("clearing a required field and saving shows validation error", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);

      const saveButton = screen.getByRole("button", { name: "Save" });

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Keywords is required")).toBeDefined();
      });
    });
  });

  describe("save flow", () => {
    test("successful save clears dirty state", async () => {
      setAuth(BASE_POWERS);
      const obj = makeObj();
      mockFetch([{ body: obj, url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "changed keywords");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // PUT hits the same URL - the mock returns the obj, which satisfies objSchema
      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });
    });

    test("server validation error keeps form dirty", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "changed keywords");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Re-mock so the PUT returns a 400 error
      resetFetchMock();
      mockFetch([
        {
          body: { error: "Invalid object data" },
          status: 400,
          url: `/api/objects/${VNUM}`,
        },
      ]);

      await user.click(saveButton);

      // Save button should remain enabled - dirty state was not cleared
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });
    });

    test("server validation error is surfaced", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(
        <>
          <ObjectEditor vnumParam={VNUM} />
          <Toaster />
        </>,
      );
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "bad keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      resetFetchMock();
      mockFetch([
        {
          body: { error: "Invalid object data" },
          status: 400,
          url: `/api/objects/${VNUM}`,
        },
      ]);

      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid object data")).toBeDefined();
      });
    });

    test("save sends correct payload shape", async () => {
      setAuth(BASE_POWERS);
      mockObjEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "payload test object");

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
      expect(putCall.url).toContain(`/api/objects/${VNUM}`);

      expect(putCall.body).toEqual(
        expect.objectContaining({
          affects: [],
          name: "payload test object",
          short_desc: "a test object",
          type: 0,
          vnum: 1000,
          weight: 5,
        }),
      );
    });
  });

  describe("sub-component integration", () => {
    test("adding an apply includes it in save payload", async () => {
      setAuth([...BASE_POWERS, POWER.OEDIT_APPLYS]);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Click "Add applies" button to add an applies row
      const addButton = screen.getByRole("button", {
        name: /add applies/i,
      });
      await user.click(addButton);

      // A new row appears with Apply Type, Modifier fields.
      // The default type is 0 and mod values are 0 - just verify
      // the row was added by finding the new label, then save.
      await screen.findByLabelText("Apply Type");

      // Save button should be enabled (dirty state from applies change)
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
      expect(putCall.url).toContain(`/api/objects/${VNUM}`);
      expect(putCall.body).toEqual(
        expect.objectContaining({
          affects: [expect.objectContaining({ mod1: 0, mod2: 0, type: 0 })],
        }),
      );
    });
  });

  describe("OEDIT_WEAPONS power gates weapon value fields", () => {
    test("user without OEDIT_WEAPONS sees weapon fields as disabled", async () => {
      setAuth(BASE_POWERS);
      const weaponObj = makeObj({ type: 5, val0: 0x80_50 });
      mockFetch([{ body: weaponObj, url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Weapon-specific fields should render but be disabled
      await waitFor(() => {
        expect(screen.getByText("Damage Level")).toBeDefined();
      });
      const damageInput = screen.getByRole("spinbutton", {
        name: "Damage Level",
      });
      expect(
        damageInput.hasAttribute("disabled") ||
          damageInput.hasAttribute("readonly"),
      ).toBe(true);
    });

    test("user with OEDIT_WEAPONS sees weapon fields as enabled", async () => {
      setAuth([...BASE_POWERS, POWER.OEDIT_WEAPONS]);
      const weaponObj = makeObj({ type: 5, val0: 0x80_50 });
      mockFetch([{ body: weaponObj, url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Damage Level")).toBeDefined();
      });
      const damageInput = screen.getByRole("spinbutton", {
        name: "Damage Level",
      });
      expect(damageInput.hasAttribute("disabled")).toBe(false);
    });
  });

  describe("OEDIT_APPLYS power gates applies editing", () => {
    test("user without OEDIT_APPLYS cannot add applies", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // The Applies section renders but Add button should not be present
      // because readOnly is passed to SubTable when !canEditObjectApplys
      expect(screen.queryByRole("button", { name: /add applies/i })).toBeNull();

      // But the rest of the form is editable - name input is not disabled
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      expect(nameInput.hasAttribute("disabled")).toBe(false);
    });

    test("user with OEDIT_APPLYS can add applies", async () => {
      setAuth([...BASE_POWERS, POWER.OEDIT_APPLYS]);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Add button for applies should be present
      expect(
        screen.getByRole("button", { name: /add applies/i }),
      ).toBeDefined();
    });
  });

  describe("undo button", () => {
    test("clicking Undo reverts form and disables Save", async () => {
      setAuth(BASE_POWERS);
      const obj = makeObj({ name: "original object name" });
      mockFetch([{ body: obj, url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      // Make the form dirty
      await user.clear(nameInput);
      await user.type(nameInput, "changed object name");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Click the Undo button
      const undoButton = screen.getByRole("button", { name: "Undo" });
      await user.click(undoButton);

      // Form reverts to original value
      await waitFor(() => {
        expect(nameInput.getAttribute("value")).toBe("original object name");
      });

      // Save button becomes disabled again
      expect(saveButton.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("sub-table row removal", () => {
    test("removing an affects row excludes it from save payload", async () => {
      setAuth([...BASE_POWERS, POWER.OEDIT_APPLYS]);
      const obj = makeObj({
        affects: [{ mod1: 5, mod2: 0, type: 1, vnum: 1000 }],
      });
      mockFetch([
        { body: obj, method: "GET", url: `/api/objects/${VNUM}` },
        { body: obj, method: "PUT", url: `/api/objects/${VNUM}` },
      ]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Verify the affects row is displayed
      await waitFor(() => {
        expect(screen.getByLabelText("Apply Type")).toBeDefined();
      });

      // Click the remove button for the first row
      const removeButton = screen.getByRole("button", {
        name: /remove row 1/i,
      });
      await user.click(removeButton);

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
      expect(putCall.url).toContain(`/api/objects/${VNUM}`);
      expect(putCall.body).toEqual(expect.objectContaining({ affects: [] }));
    });
  });

  describe("delete flow", () => {
    test("delete button triggers confirmation dialog", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(
          screen.getByText(/are you sure you want to delete/i),
        ).toBeDefined();
      });
      expect(screen.getByRole("button", { name: "Yes, delete" })).toBeDefined();
    });

    test("confirming delete calls the API", async () => {
      setAuth(BASE_POWERS);
      mockFetch([{ body: makeObj(), url: `/api/objects/${VNUM}` }]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Keywords")).toBeDefined();
      });

      // Open the confirmation dialog
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      await user.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, delete",
      });

      // Re-mock for the DELETE response
      resetFetchMock();
      mockFetch([{ body: { ok: true }, url: `/api/objects/${VNUM}` }]);

      await user.click(confirmButton);

      // After successful delete, the dialog should close
      await waitFor(() => {
        expect(
          screen.queryByText(/are you sure you want to delete/i),
        ).toBeNull();
      });

      // Verify the DELETE request was sent to the correct URL
      const deleteCall = getFetchLog().find((c) => c.method === "DELETE");
      expect(deleteCall).toBeDefined();
      expect(deleteCall?.url).toContain(`/api/objects/${VNUM}`);
    });
  });

  describe("network errors", () => {
    test("failed entity fetch shows error state", async () => {
      setAuth(BASE_POWERS);
      mockFetch([
        {
          body: { error: "Internal server error" },
          status: 500,
          url: `/api/objects/${VNUM}`,
        },
      ]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeDefined();
      });
    });
  });
});
