import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { Obj } from "@/shared/schemas/obj.ts";

import { Toaster } from "@/components/ui/sonner.tsx";
import { POWER } from "@/shared/powers.ts";
import {
  findFetchCall,
  makeObj,
  mockFetch,
  renderWithProviders,
  resetFetchMock,
  resetTestState,
  setTestAuth,
  waitForEditorReady,
  waitForSaveDisabled,
  waitForSaveEnabled,
} from "@/test-helpers-component.tsx";

import { ObjectEditor } from "./object-editor.tsx";

const VNUM = "1000";
const BASE_POWERS = [POWER.BUILDER, POWER.OEDIT];

function mockObjectEndpoints(obj?: Obj) {
  mockFetch([{ body: obj ?? makeObj(), url: `/api/objects/${VNUM}` }]);
}

describe("ObjectEditor", () => {
  afterEach(resetTestState);

  describe("read-only mode", () => {
    beforeEach(() => {
      setTestAuth([POWER.BUILDER]);
    });

    test("renders ReadOnlyBanner when user lacks OEDIT", async () => {
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      expect(await screen.findByText(/read[-\s]?only/i)).toBeDefined();
    });

    test("Save button absent in read-only mode", async () => {
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });

    test("form inputs disabled in read-only mode", async () => {
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      expect(
        nameInput.hasAttribute("disabled") ||
          nameInput.hasAttribute("readonly"),
      ).toBe(true);
    });

    test("Applies sub-table Add/Remove buttons hidden when readOnly", async () => {
      mockObjectEndpoints(
        makeObj({ affects: [{ mod1: 0, mod2: 0, type: 0, vnum: 1000 }] }),
      );
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      await screen.findByText(/read[-\s]?only/i);
      expect(screen.queryByRole("button", { name: /add applies/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /remove row/i })).toBeNull();
    });

    test("Diff button still accessible in read-only mode", async () => {
      mockObjectEndpoints();
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
      setTestAuth([...BASE_POWERS, POWER.OEDIT_WEAPONS]);
    });

    test("weapon type renders Current Sharpness and Max Sharpness fields", async () => {
      mockObjectEndpoints(makeObj({ type: 5, val0: 0x80_50 }));

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Current Sharpness")).toBeDefined();
      });
      expect(screen.getByText("Max Sharpness")).toBeDefined();
      expect(screen.getByText("Damage Level")).toBeDefined();
      expect(screen.getByText("Damage Deviation")).toBeDefined();
    });

    test("container type renders Weight Capacity and Container Flags fields", async () => {
      mockObjectEndpoints(makeObj({ type: 15, val0: 100, val1: 3 }));

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Weight Capacity")).toBeDefined();
      });
      expect(screen.getByText("Container Flags")).toBeDefined();
      expect(screen.getByText("Volume Capacity")).toBeDefined();
    });

    test("type with no spec fields renders only common fields", async () => {
      // Type 18 (Key) has an empty fields array in OBJ_TYPE_SPECS
      mockObjectEndpoints(makeObj({ type: 18 }));

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitForEditorReady("Keywords");

      expect(screen.getByText("Price")).toBeDefined();
      expect(screen.getByText("Weight")).toBeDefined();

      expect(screen.queryByText("Current Sharpness")).toBeNull();
      expect(screen.queryByText("Weight Capacity")).toBeNull();
      // Generic fallback values (Value 0-3) also absent for known type with empty spec
      expect(screen.queryByText("Value 0")).toBeNull();
    });
  });

  describe("type switch updates visible fields", () => {
    beforeEach(() => {
      setTestAuth([...BASE_POWERS, POWER.OEDIT_WEAPONS]);
    });

    test("switching from weapon to container replaces type-specific fields", async () => {
      mockObjectEndpoints(makeObj({ type: 5, val0: 0x80_50 }));
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Current Sharpness")).toBeDefined();
      });

      const typeInput = screen.getByRole("combobox", { name: /item type/i });
      await user.clear(typeInput);
      await user.type(typeInput, "Chest");

      const option = await screen.findByRole("option", {
        name: /Chest\/Container/,
      });
      await user.click(option);

      await waitFor(() => {
        expect(screen.getByText("Weight Capacity")).toBeDefined();
      });
      expect(screen.queryByText("Current Sharpness")).toBeNull();
    });
  });

  describe("OEDIT_COST power gates price field", () => {
    test("user without OEDIT_COST sees price input as disabled", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();

      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Price")).toBeDefined();
      });

      const priceInput = screen.getByRole("spinbutton", { name: "Price" });
      expect(priceInput.hasAttribute("disabled")).toBe(true);
    });

    test("user with OEDIT_COST sees price input as enabled", async () => {
      setTestAuth([...BASE_POWERS, POWER.OEDIT_COST]);
      mockObjectEndpoints();

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
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed object keywords");

      await waitForSaveEnabled(saveButton);
    });

    test("reverting field to original value disables the Save button", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints(makeObj({ name: "original keywords" }));
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "something different");

      await waitForSaveEnabled(saveButton);

      await user.clear(nameInput);
      await user.type(nameInput, "original keywords");

      await waitForSaveDisabled(saveButton);
    });
  });

  describe("client-side validation", () => {
    test("clearing a required field and saving shows validation error", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);

      const saveButton = screen.getByRole("button", { name: "Save" });

      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Keywords is required")).toBeDefined();
      });
    });
  });

  describe("save flow", () => {
    test("successful save clears dirty state", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "changed keywords");

      await waitForSaveEnabled(saveButton);

      // PUT hits the same URL - the mock returns the obj, which satisfies objSchema
      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);
    });

    test("server validation error keeps form dirty", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "changed keywords");

      await waitForSaveEnabled(saveButton);

      resetFetchMock();
      mockFetch([
        {
          body: { error: "Invalid object data" },
          status: 400,
          url: `/api/objects/${VNUM}`,
        },
      ]);

      await user.click(saveButton);

      await waitForSaveEnabled(saveButton);
    });

    test("server validation error is surfaced", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(
        <>
          <ObjectEditor vnumParam={VNUM} />
          <Toaster />
        </>,
      );
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "bad keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

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
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      await user.clear(nameInput);
      await user.type(nameInput, "payload test object");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
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
      setTestAuth([...BASE_POWERS, POWER.OEDIT_APPLYS]);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const addButton = screen.getByRole("button", {
        name: /add applies/i,
      });
      await user.click(addButton);

      // The default Apply Type is 0 and mod values are 0; verify the row was
      // added by finding the new label, then save.
      await screen.findByLabelText("Apply Type");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
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
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints(makeObj({ type: 5, val0: 0x80_50 }));
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitForEditorReady("Keywords");

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
      setTestAuth([...BASE_POWERS, POWER.OEDIT_WEAPONS]);
      mockObjectEndpoints(makeObj({ type: 5, val0: 0x80_50 }));
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
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitForEditorReady("Keywords");

      // readOnly is passed to SubTable when !canEditObjectApplys, hiding the
      // Add button while leaving the rest of the form editable.
      expect(screen.queryByRole("button", { name: /add applies/i })).toBeNull();

      const nameInput = screen.getByRole("textbox", { name: /keywords/i });
      expect(nameInput.hasAttribute("disabled")).toBe(false);
    });

    test("user with OEDIT_APPLYS can add applies", async () => {
      setTestAuth([...BASE_POWERS, POWER.OEDIT_APPLYS]);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);

      await waitForEditorReady("Keywords");

      expect(
        screen.getByRole("button", { name: /add applies/i }),
      ).toBeDefined();
    });
  });

  describe("undo button", () => {
    test("clicking Undo reverts form and disables Save", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints(makeObj({ name: "original object name" }));
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /keywords/i });

      await user.clear(nameInput);
      await user.type(nameInput, "changed object name");

      await waitForSaveEnabled(saveButton);

      const undoButton = screen.getByRole("button", { name: "Undo" });
      await user.click(undoButton);

      await waitFor(() => {
        expect(nameInput.getAttribute("value")).toBe("original object name");
      });

      expect(saveButton.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("sub-table row removal", () => {
    test("removing an affects row excludes it from save payload", async () => {
      setTestAuth([...BASE_POWERS, POWER.OEDIT_APPLYS]);
      const obj = makeObj({
        affects: [{ mod1: 5, mod2: 0, type: 1, vnum: 1000 }],
      });
      mockFetch([
        { body: obj, method: "GET", url: `/api/objects/${VNUM}` },
        { body: obj, method: "PUT", url: `/api/objects/${VNUM}` },
      ]);
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      await waitFor(() => {
        expect(screen.getByLabelText("Apply Type")).toBeDefined();
      });

      const removeButton = screen.getByRole("button", {
        name: /remove row 1/i,
      });
      await user.click(removeButton);

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitForSaveEnabled(saveButton);

      await user.click(saveButton);

      await waitForSaveDisabled(saveButton);

      const putCall = findFetchCall("PUT");
      expect(putCall.url).toContain(`/api/objects/${VNUM}`);
      expect(putCall.body).toEqual(expect.objectContaining({ affects: [] }));
    });
  });

  describe("delete flow", () => {
    test("delete button triggers confirmation dialog", async () => {
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

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
      setTestAuth(BASE_POWERS);
      mockObjectEndpoints();
      renderWithProviders(<ObjectEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitForEditorReady("Keywords");

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      await user.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, delete",
      });

      resetFetchMock();
      mockFetch([{ body: { ok: true }, url: `/api/objects/${VNUM}` }]);

      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/are you sure you want to delete/i),
        ).toBeNull();
      });

      const deleteCall = findFetchCall("DELETE");
      expect(deleteCall.url).toContain(`/api/objects/${VNUM}`);
    });
  });

  describe("network errors", () => {
    test("failed entity fetch shows error state", async () => {
      setTestAuth(BASE_POWERS);
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
