// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { MobListItem } from "@/shared/schemas/mob.ts";
import type { RoomListItem } from "@/shared/schemas/room.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { MobList } from "./mob-list.tsx";
import { RoomList } from "./room-list.tsx";

/** Set auth store with room builder powers. */
function setAuthRooms() {
  useAuthStore.setState({
    user: {
      blocks: [{ end: 1099, start: 1000 }],
      isSenior: false,
      playerId: 99_999,
      playerName: "TestBuilder",
      powers: [POWER.BUILDER, POWER.REDIT, POWER.RSAVE, POWER.EDIT],
      username: "testbuilder",
    },
  });
}

/** Set auth store with mob builder powers. */
function setAuthMobs() {
  useAuthStore.setState({
    user: {
      blocks: [{ end: 1099, start: 1000 }],
      isSenior: false,
      playerId: 99_999,
      playerName: "TestBuilder",
      powers: [POWER.BUILDER, POWER.MEDIT],
      username: "testbuilder",
    },
  });
}

const mockRooms: RoomListItem[] = [
  { name: "Dusty Corridor", sector: 25, vnum: 1000 },
  { name: "Town Square", sector: 30, vnum: 1001 },
  { name: "Dark Cave", sector: 5, vnum: 1002 },
];

const mockMobs: MobListItem[] = [
  {
    level: 10,
    name: "goblin warrior",
    race: 0,
    short_desc: "a goblin warrior",
    vnum: 1000,
  },
  {
    level: 25,
    name: "orc shaman",
    race: 3,
    short_desc: "an orc shaman",
    vnum: 1001,
  },
];

describe("RoomList (EntityList)", () => {
  beforeEach(() => {
    setAuthRooms();
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("renders room list with vnums and names", async () => {
    mockFetch([{ body: mockRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );

    // Wait for data to load, then scope to the table view
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Dusty Corridor")).toBeDefined();
    expect(within(table).getByText("Town Square")).toBeDefined();
    expect(within(table).getByText("Dark Cave")).toBeDefined();

    // Vnums appear as links in the table rows
    const rows = within(table).getAllByRole("row");
    // Header row + 3 data rows
    expect(rows.length).toBeGreaterThanOrEqual(4);

    // Vnum links point to the correct room
    expect(within(table).getByRole("link", { name: "1000" })).toBeDefined();
    expect(within(table).getByRole("link", { name: "1001" })).toBeDefined();
  });

  test("client-side search filters the list", async () => {
    mockFetch([{ body: mockRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    // Wait for data to load
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Dusty Corridor")).toBeDefined();

    // Type in the search input
    const searchInput = screen.getByPlaceholderText(
      "Search by vnum or name...",
    );
    await user.type(searchInput, "cave");

    // Only matching room should remain in the table
    await waitFor(() => {
      expect(within(table).getByText("Dark Cave")).toBeDefined();
      expect(within(table).queryByText("Dusty Corridor")).toBeNull();
      expect(within(table).queryByText("Town Square")).toBeNull();
    });
  });

  test("empty list renders empty state", async () => {
    mockFetch([{ body: [], url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );

    const table = await screen.findByRole("table");
    await waitFor(() => {
      expect(within(table).getByText(/no rooms yet/i)).toBeDefined();
    });
  });

  test("card view renders entity names", async () => {
    mockFetch([{ body: mockRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    // Wait for data, then switch to card view
    await screen.findByRole("table");
    const toggleButton = screen.getByRole("button", {
      name: /switch to card view/i,
    });
    await user.click(toggleButton);

    // Card view should show all room names
    const names = screen.getAllByText("Dusty Corridor");
    // At least one instance should be in the now-visible card view
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Town Square").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Dark Cave").length).toBeGreaterThanOrEqual(1);
  });
});

function setAuthSenior() {
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
}

describe("RoomList cross-owner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("TEST-CROSS-OWNER-LIST-1: senior All view shows owner column", async () => {
    setAuthSenior();
    // Default "mine" fetch for initial render
    mockFetch([
      {
        body: [
          {
            name: "Room A",
            owner: "TestBuilder",
            player_id: 42,
            sector: 0,
            vnum: 100,
          },
        ],
        url: "/api/rooms",
      },
    ]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    // Wait for table to render
    await screen.findByRole("table");

    // Reset fetch mock to serve the "all" response
    resetFetchMock();
    mockFetch([
      {
        body: [
          {
            name: "Room A",
            owner: "TestBuilder",
            player_id: 42,
            sector: 0,
            vnum: 100,
          },
          {
            name: "Room B",
            owner: "OtherBuilder",
            player_id: 77,
            sector: 0,
            vnum: 101,
          },
        ],
        url: "/api/rooms",
      },
    ]);

    // Click All toggle
    await user.click(screen.getByRole("button", { name: /^All$/i }));

    await waitFor(() => {
      const freshTable = screen.getByRole("table");
      expect(within(freshTable).getByText("OtherBuilder")).toBeDefined();
    });
    const freshTable = screen.getByRole("table");
    expect(
      within(freshTable).getByRole("columnheader", { name: /owner/i }),
    ).toBeDefined();
  });

  test("TEST-CROSS-OWNER-LIST-2: non-senior sees no owner toggle", async () => {
    setAuthRooms();
    mockFetch([{ body: mockRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /^All$/i })).toBeNull();
  });

  test("TEST-CROSS-OWNER-LIST-3: New button hidden when toggle is All", async () => {
    setAuthSenior();
    mockFetch([
      {
        body: [
          {
            name: "Room A",
            owner: "TestBuilder",
            player_id: 42,
            sector: 0,
            vnum: 100,
          },
        ],
        url: "/api/rooms",
      },
    ]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();
    await screen.findByRole("table");

    // Reset fetch for "all" response
    resetFetchMock();
    mockFetch([
      {
        body: [
          {
            name: "Room A",
            owner: "TestBuilder",
            player_id: 42,
            sector: 0,
            vnum: 100,
          },
        ],
        url: "/api/rooms",
      },
    ]);

    await user.click(screen.getByRole("button", { name: /^All$/i }));

    // The "Add" button (vnum picker trigger) should not appear in All mode
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /add/i })).toBeNull();
    });
  });

  test("TEST-CROSS-OWNER-LIST-5: row click URL varies by owner", async () => {
    setAuthSenior();
    // Serve initial "mine" data
    mockFetch([
      {
        body: [
          {
            name: "Room A",
            owner: "TestBuilder",
            player_id: 42,
            sector: 0,
            vnum: 100,
          },
        ],
        url: "/api/rooms",
      },
    ]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();
    await screen.findByRole("table");

    // Switch to All view
    resetFetchMock();
    mockFetch([
      {
        body: [
          {
            name: "Room A",
            owner: "TestBuilder",
            player_id: 42,
            sector: 0,
            vnum: 100,
          },
          {
            name: "Room B",
            owner: "OtherBuilder",
            player_id: 77,
            sector: 0,
            vnum: 101,
          },
        ],
        url: "/api/rooms",
      },
    ]);
    await user.click(screen.getByRole("button", { name: /^All$/i }));

    await waitFor(() => {
      const freshTable = screen.getByRole("table");
      expect(within(freshTable).getByText("OtherBuilder")).toBeDefined();
    });

    // Re-query table after data has loaded
    const freshTable = screen.getByRole("table");

    // Own-row link: no owner search param (playerId matches currentUserId)
    const ownLink = within(freshTable).getByRole("link", { name: "100" });
    expect(ownLink.getAttribute("href")).toBe("/rooms/100");

    // Cross-owner row link: includes ?owner= param
    const crossLink = within(freshTable).getByRole("link", { name: "101" });
    expect(crossLink.getAttribute("href")).toContain("owner=77");
  });
});

describe("MobList (EntityList)", () => {
  beforeEach(() => {
    setAuthMobs();
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("renders mob list with short descriptions and metadata", async () => {
    mockFetch([{ body: mockMobs, url: "/api/mobs" }]);
    renderWithProviders(
      <MobList
        from={undefined}
        to={undefined}
      />,
    );

    // MobList uses short_desc as the display name
    const table = await screen.findByRole("table");
    expect(within(table).getByText("a goblin warrior")).toBeDefined();
    expect(within(table).getByText("an orc shaman")).toBeDefined();

    // Vnum links present
    expect(within(table).getByRole("link", { name: "1000" })).toBeDefined();
    expect(within(table).getByRole("link", { name: "1001" })).toBeDefined();
  });
});
