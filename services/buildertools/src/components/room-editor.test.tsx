// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { Room } from "@/shared/schemas/room.ts";
import type { Zone } from "@/shared/schemas/zone.ts";

import { Toaster } from "@/components/ui/sonner.tsx";
import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  getFetchLog,
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { RoomEditor } from "./room-editor.tsx";

/** Minimal valid Room for API mock responses. Override fields as needed. */
function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    capacity: 0,
    description: "A simple test room.",
    exits: [],
    extras: [],
    height: -1,
    name: "Test Room",
    river_dir: -1,
    river_speed: 0,
    room_flag: 131_072,
    sector: 60,
    spec: 0,
    telelook: 0,
    teletarg: 0,
    teletime: 0,
    vnum: 1000,
    x: 0,
    y: 0,
    z: 0,
    zone: 1,
    ...overrides,
  };
}

const mockZones: Zone[] = [
  {
    age: null,
    bottom: null,
    lifespan: null,
    reset_mode: null,
    top: null,
    util_flag: null,
    zone_enabled: 0,
    zone_name: "Test Zone",
    zone_nr: 1,
  },
];

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
const BASE_POWERS = [POWER.BUILDER, POWER.REDIT, POWER.RSAVE, POWER.EDIT];

function mockRoomEndpoints(room?: Room, zones?: Zone[]) {
  const r = room ?? makeRoom();
  mockFetch([
    { body: r, method: "GET", url: `/api/rooms/${VNUM}` },
    { body: r, method: "PUT", url: `/api/rooms/${VNUM}` },
    { body: zones ?? mockZones, url: "/api/zones" },
  ]);
}

describe("RoomEditor", () => {
  beforeEach(() => {
    setAuth(BASE_POWERS);
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("renders room fields after loading", async () => {
    mockRoomEndpoints();
    renderWithProviders(<RoomEditor vnumParam={VNUM} />);

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeDefined();
    });
    expect(screen.getByText("Description")).toBeDefined();
    // Properties section fields (collapsed but still in DOM)
    expect(screen.getByText("Room Spec")).toBeDefined();
    expect(screen.getByText("Sector Type")).toBeDefined();
  });

  describe("dirty state tracking", () => {
    test("editing a field enables the Save button", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      await user.clear(nameInput);
      await user.type(nameInput, "changed room name");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });
    });

    test("reverting field to original value disables the Save button", async () => {
      const room = makeRoom({ name: "original name" });
      mockRoomEndpoints(room);
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /name/i });

      await user.clear(nameInput);
      await user.type(nameInput, "something different");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.clear(nameInput);
      await user.type(nameInput, "original name");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });
    });
  });

  describe("client-side validation", () => {
    test("clearing name shows validation error", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      await user.clear(nameInput);

      const saveButton = screen.getByRole("button", { name: "Save" });

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeDefined();
      });
    });
  });

  test("read-only mode: banner, no save, inputs disabled, diff accessible", async () => {
    setAuth([POWER.BUILDER]);
    mockRoomEndpoints();
    renderWithProviders(<RoomEditor vnumParam={VNUM} />);

    // TEST-RO-1: ReadOnlyBanner renders
    expect(await screen.findByText(/read[-\s]?only/i)).toBeDefined();

    // TEST-RO-2: Save button absent
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();

    // TEST-RO-3: form inputs disabled
    const nameInput = screen.getByRole("textbox", { name: /name/i });
    expect(
      nameInput.hasAttribute("disabled") || nameInput.hasAttribute("readonly"),
    ).toBe(true);

    // TEST-RO-5: Diff button still accessible
    const diffButtons = screen.getAllByRole("button", {
      name: /compare|diff/i,
    });
    expect(diffButtons.length).toBeGreaterThan(0);
  });

  test("cross-owner: editor shows different owner's data after remount", async () => {
    useAuthStore.setState({
      user: {
        blocks: [{ end: 1099, start: 1000 }],
        isSenior: true,
        playerId: 42,
        playerName: "SeniorBuilder",
        powers: [POWER.BUILDER, POWER.REDIT, POWER.RSAVE, POWER.EDIT],
        username: "seniorbuilder",
      },
    });

    // First mount: owner = 1
    mockFetch([
      {
        body: makeRoom({ name: "owner1 room", vnum: 100 }),
        url: "/api/rooms/100",
      },
      { body: mockZones, url: "/api/zones" },
      { body: { id: 1, name: "FirstOwner" }, url: "/api/players/1" },
    ]);
    const { unmount } = renderWithProviders(
      <RoomEditor
        owner={1}
        vnumParam="100"
      />,
    );
    await waitFor(() => {
      const input = screen.getByRole("textbox", { name: /name/i });
      expect(input.getAttribute("value")).toBe("owner1 room");
    });
    unmount();
    resetFetchMock();

    // Second mount: owner = 2
    mockFetch([
      {
        body: makeRoom({ name: "owner2 room", vnum: 100 }),
        url: "/api/rooms/100",
      },
      { body: mockZones, url: "/api/zones" },
      { body: { id: 2, name: "SecondOwner" }, url: "/api/players/2" },
    ]);
    renderWithProviders(
      <RoomEditor
        owner={2}
        vnumParam="100"
      />,
    );
    await waitFor(() => {
      const input = screen.getByRole("textbox", { name: /name/i });
      expect(input.getAttribute("value")).toBe("owner2 room");
    });
  });

  describe("save flow", () => {
    test("successful save clears dirty state", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton.hasAttribute("disabled")).toBe(true);

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      await user.clear(nameInput);
      await user.type(nameInput, "edited room name");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(true);
      });
    });

    test("server validation error keeps dirty state", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      await user.clear(nameInput);
      await user.type(nameInput, "bad room name");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Swap mock so the PUT returns 400
      resetFetchMock();
      mockFetch([
        {
          body: { error: "Some validation error" },
          status: 400,
          url: `/api/rooms/${VNUM}`,
        },
        { body: mockZones, url: "/api/zones" },
      ]);

      await user.click(saveButton);

      // Save button should remain enabled - dirty state not cleared on error
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });
    });

    test("server validation error is surfaced", async () => {
      mockRoomEndpoints();
      renderWithProviders(
        <>
          <RoomEditor vnumParam={VNUM} />
          <Toaster />
        </>,
      );
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      await user.clear(nameInput);
      await user.type(nameInput, "bad room name");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      resetFetchMock();
      mockFetch([
        {
          body: { error: "Some validation error" },
          status: 400,
          url: `/api/rooms/${VNUM}`,
        },
        { body: mockZones, url: "/api/zones" },
      ]);

      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Some validation error")).toBeDefined();
      });
    });

    test("save sends correct payload shape", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const nameInput = screen.getByRole("textbox", { name: /name/i });
      await user.clear(nameInput);
      await user.type(nameInput, "payload test room");

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
      expect(putCall.url).toContain(`/api/rooms/${VNUM}`);

      expect(putCall.body).toEqual(
        expect.objectContaining({
          description: "A simple test room.",
          exits: [],
          name: "payload test room",
          sector: 60,
          vnum: 1000,
          zone: 1,
        }),
      );
    });
  });

  describe("sub-component integration", () => {
    test("adding an exit includes it in save payload", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      // Click "Add exit" button to add an exit row
      const addButton = screen.getByRole("button", { name: /add exit/i });
      await user.click(addButton);

      // A new exit row appears. Fill in the destination field.
      // Destination is an EntityPicker (text input), not a spinbutton.
      const destInput = await screen.findByLabelText("Destination");
      await user.clear(destInput);
      await user.type(destInput, "1001");
      // Blur to commit the EntityPicker value
      await user.tab();

      // Save button should be enabled (dirty state from exits change)
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
      expect(putCall.url).toContain(`/api/rooms/${VNUM}`);
      expect(putCall.body).toEqual(
        expect.objectContaining({
          exits: [expect.objectContaining({ destination: 1001 })],
        }),
      );
    });

    test("adding an extra description includes it in save payload", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      // Click "Add extra description" button
      const addButton = screen.getByRole("button", {
        name: /add extra description/i,
      });
      await user.click(addButton);

      // A new extra row appears with Keywords and Description fields.
      // Find the extra's Keywords input (room form has "Name", not "Keywords")
      const extraKeywords = await screen.findByRole("textbox", {
        name: /keywords/i,
      });
      await user.type(extraKeywords, "wall painting");

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
      expect(putCall.url).toContain(`/api/rooms/${VNUM}`);
      expect(putCall.body).toEqual(
        expect.objectContaining({
          extras: [expect.objectContaining({ name: "wall painting" })],
        }),
      );
    });
  });

  describe("undo button", () => {
    test("clicking Undo reverts form and disables Save", async () => {
      const room = makeRoom({ name: "original room name" });
      mockRoomEndpoints(room);
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      const nameInput = screen.getByRole("textbox", { name: /name/i });

      // Make the form dirty
      await user.clear(nameInput);
      await user.type(nameInput, "changed room name");

      await waitFor(() => {
        expect(saveButton.hasAttribute("disabled")).toBe(false);
      });

      // Click the Undo button
      const undoButton = screen.getByRole("button", { name: "Undo" });
      await user.click(undoButton);

      // Form reverts to original value
      await waitFor(() => {
        expect(nameInput.getAttribute("value")).toBe("original room name");
      });

      // Save button becomes disabled again
      expect(saveButton.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("sub-table row removal", () => {
    test("removing an exit excludes it from save payload", async () => {
      const room = makeRoom({
        exits: [
          {
            block: null,
            condition_flag: 0,
            description: "",
            destination: 100,
            direction: 0,
            key_num: -1,
            lock_difficulty: 0,
            name: "",
            type: 0,
            vnum: 1000,
            weight: 0,
          },
        ],
      });
      mockRoomEndpoints(room);
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      // Verify the exit row is displayed (North direction is the default for direction 0)
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /remove north exit/i }),
        ).toBeDefined();
      });

      // Click the remove button for the north exit
      const removeButton = screen.getByRole("button", {
        name: /remove north exit/i,
      });
      await user.click(removeButton);

      // Since the exit has destination data, a confirmation dialog appears
      const confirmButton = await screen.findByRole("button", {
        name: /confirm/i,
      });
      await user.click(confirmButton);

      // Save button should be enabled (dirty state from exit removal)
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
      expect(putCall.url).toContain(`/api/rooms/${VNUM}`);
      expect(putCall.body).toEqual(expect.objectContaining({ exits: [] }));
    });
  });

  describe("delete flow", () => {
    test("delete button triggers confirmation dialog", async () => {
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      const user = userEvent.setup();
      await user.click(deleteButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            `Are you sure you want to delete room ${VNUM}? This also removes all exits.`,
          ),
        ).toBeDefined();
      });
    });

    test("confirming delete calls the API", async () => {
      mockFetch([
        { body: makeRoom(), url: `/api/rooms/${VNUM}` },
        { body: mockZones, url: "/api/zones" },
      ]);
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      // Swap mock so DELETE returns success
      resetFetchMock();
      mockFetch([
        { body: { ok: true }, url: `/api/rooms/${VNUM}` },
        { body: mockZones, url: "/api/zones" },
      ]);

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      await user.click(deleteButton);

      const confirmButton = await screen.findByRole("button", {
        name: "Yes, delete",
      });
      await user.click(confirmButton);

      // After delete, the component navigates away. The confirmation dialog
      // should be gone.
      await waitFor(() => {
        expect(
          screen.queryByText(
            `Are you sure you want to delete room ${VNUM}? This also removes all exits.`,
          ),
        ).toBeNull();
      });
    });
  });

  describe("network errors", () => {
    test("failed entity fetch shows error state", async () => {
      mockFetch([
        {
          body: { error: "Internal server error" },
          status: 500,
          url: `/api/rooms/${VNUM}`,
        },
        { body: mockZones, url: "/api/zones" },
      ]);
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/)).toBeDefined();
      });
    });
  });

  describe("REDIT_ENABLED power gates room spec options", () => {
    test("user without REDIT_ENABLED cannot select unassignable room specs", async () => {
      setAuth(BASE_POWERS);
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      // "Bank Main Entrance" (value 2) is unassignable without REDIT_ENABLED
      const specInput = screen.getByRole("combobox", { name: /room spec/i });
      await user.type(specInput, "Bank");

      await waitFor(() => {
        expect(
          screen.queryByRole("option", { name: /Bank Main Entrance/ }),
        ).toBeNull();
      });
    });

    test("user with REDIT_ENABLED can select unassignable room specs", async () => {
      setAuth([...BASE_POWERS, POWER.REDIT_ENABLED]);
      mockRoomEndpoints();
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      const specInput = screen.getByRole("combobox", { name: /room spec/i });
      await user.type(specInput, "Bank");

      // "Bank Main Entrance" (value 2) should be available with REDIT_ENABLED
      const option = await screen.findByRole("option", {
        name: /Bank Main Entrance/,
      });
      expect(option).toBeDefined();
    });
  });
});
