// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { MobListItem } from "@/shared/schemas/mob.ts";
import type { RoomListItem } from "@/shared/schemas/room.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  getFetchLog,
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
    expect(rows).toHaveLength(4);

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

  test("card view toggle switches view mode", async () => {
    mockFetch([{ body: mockRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    // Wait for data to load in table view
    await screen.findByRole("table");

    // Toggle button should indicate we can switch to card view
    const toggleButton = screen.getByRole("button", {
      name: /switch to card view/i,
    });
    await user.click(toggleButton);

    // After toggle: button text switches to "Switch to table view",
    // confirming viewMode state changed from "table" to "card".
    // The className swap (block/hidden) is driven by this same state variable,
    // so verifying the state changed verifies the visibility swap.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /switch to table view/i }),
      ).toBeDefined();
    });

    // Toggling back restores the original button label, confirming
    // the view mode toggles bidirectionally.
    await user.click(
      screen.getByRole("button", { name: /switch to table view/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /switch to card view/i }),
      ).toBeDefined();
    });
  });

  test("select-all and bulk delete sends correct vnums", async () => {
    mockFetch([{ body: mockRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    const table = await screen.findByRole("table");

    // Select all via header checkbox ("Select all on this page")
    const headerCheckbox = within(table).getByRole("checkbox", {
      name: /select all on this page/i,
    });
    await user.click(headerCheckbox);

    // DeleteSelectionBar renders "Delete 3" when all 3 are selected
    const deleteButton = await screen.findByRole("button", {
      name: /delete 3/i,
    });
    await user.click(deleteButton);

    // ConfirmDialog opens - set up mock before clicking confirm so the
    // DELETE fetch is handled when the mutation fires immediately on click
    resetFetchMock();
    mockFetch([
      { body: { deleted: 3, ok: true }, url: "/api/rooms/bulk" },
      { body: mockRooms, url: "/api/rooms" },
    ]);

    // Confirm button label is "Delete" (confirmLabel prop on ConfirmDialog)
    const confirmButton = await screen.findByRole("button", {
      name: /^delete$/i,
    });
    await user.click(confirmButton);

    // Verify DELETE /api/rooms/bulk was called with all three vnums.
    // Wait for the call to appear in the log, then assert the payload shape.
    await waitFor(() => {
      expect(getFetchLog().some((c) => c.method === "DELETE")).toBe(true);
    });
    const deleteCall = getFetchLog().find((c) => c.method === "DELETE");
    if (!deleteCall) throw new Error("DELETE call not found");
    expect(deleteCall.url).toContain("/api/rooms/bulk");
    expect(deleteCall.body).toHaveProperty("vnums");
    expect(deleteCall.body).toEqual({ vnums: [1000, 1001, 1002] });
  });
});

/** Generate N rooms for pagination tests. */
function generateRooms(count: number): RoomListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Room ${i}`,
    sector: 0,
    vnum: 1000 + i,
  }));
}

describe("RoomList error and pagination", () => {
  beforeEach(() => {
    setAuthRooms();
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("fetch error displays error message", async () => {
    mockFetch([
      { body: { error: "Server error" }, status: 500, url: "/api/rooms" },
    ]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeDefined();
    });
  });

  test("pagination controls appear and navigate pages", async () => {
    // Default page size is 50, so 55 items produce 2 pages
    const manyRooms = generateRooms(55);
    mockFetch([{ body: manyRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    // Wait for table and pagination to render
    await screen.findByRole("table");
    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeDefined();
    });

    // Next button should be enabled
    const nextButton = screen.getByRole("button", {
      name: /go to next page/i,
    });
    await user.click(nextButton);

    // After navigating, we should be on page 2
    await waitFor(() => {
      expect(screen.getByText("Page 2 of 2")).toBeDefined();
    });

    // Previous button should now work
    const prevButton = screen.getByRole("button", {
      name: /go to previous page/i,
    });
    await user.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeDefined();
    });
  });

  test("clicking sortable column header toggles sort indicator", async () => {
    mockFetch([{ body: mockRooms, url: "/api/rooms" }]);
    renderWithProviders(
      <RoomList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    await screen.findByRole("table");

    // Default sort is vnum ascending - the Vnum header should show ascending indicator
    const vnumHeader = screen.getByRole("button", { name: /vnum/i });
    expect(vnumHeader.textContent).toContain("\u25B2");

    // Click Name header to sort by name ascending
    const nameHeader = screen.getByRole("button", { name: /name/i });
    await user.click(nameHeader);

    await waitFor(() => {
      // Name header should now show ascending indicator
      expect(nameHeader.textContent).toContain("\u25B2");
      // Vnum header should no longer have an indicator
      expect(vnumHeader.textContent).not.toContain("\u25B2");
      expect(vnumHeader.textContent).not.toContain("\u25BC");
    });

    // Click Name header again to toggle to descending
    await user.click(nameHeader);

    await waitFor(() => {
      expect(nameHeader.textContent).toContain("\u25BC");
    });
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

  test("senior All view shows owner column", async () => {
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

  test("non-senior sees no owner toggle", async () => {
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

  test("New button hidden when toggle is All", async () => {
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

  test("row click URL varies by owner", async () => {
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
