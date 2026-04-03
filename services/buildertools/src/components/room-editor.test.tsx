// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { Room } from "@/shared/schemas/room.ts";
import type { Zone } from "@/shared/schemas/zone.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
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
    zone_enabled: null,
    zone_name: "Test Zone",
    zone_nr: 1,
  },
];

/** Set auth store with given powers and standard user fields. */
function setAuth(powers: number[]) {
  useAuthStore.setState({
    user: {
      blocks: [{ end: 1099, start: 1000 }],
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
  mockFetch([
    { body: room ?? makeRoom(), url: `/api/rooms/${VNUM}` },
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
