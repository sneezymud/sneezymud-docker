// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { DashboardEntity } from "@/shared/schemas/publish.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { PublishDashboard } from "./publish-dashboard.tsx";

function setAuth(
  powers: number[],
  overrides: Partial<{ isSenior: boolean; playerId: number }> = {},
) {
  useAuthStore.setState({
    user: {
      blocks: [{ end: 1099, start: 1000 }],
      isSenior: false,
      playerId: 99_999,
      playerName: "TestBuilder",
      powers,
      username: "testbuilder",
      ...overrides,
    },
  });
}

const SENIOR_POWERS = [POWER.BUILDER, POWER.LOW];

const mockEntities: DashboardEntity[] = [
  {
    name: "Test Room",
    owner: "TestBuilder",
    playerId: 99_999,
    status: "modified",
    type: "room",
    vnum: 1000,
  },
  {
    name: "Another Room",
    owner: "TestBuilder",
    playerId: 99_999,
    status: "new",
    type: "room",
    vnum: 1001,
  },
  {
    name: "a goblin",
    owner: "TestBuilder",
    playerId: 99_999,
    status: "modified",
    type: "mob",
    vnum: 1002,
  },
];

describe("PublishDashboard", () => {
  beforeEach(() => {
    setAuth(SENIOR_POWERS, { isSenior: true });
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
    // Clean up localStorage entries set by the dashboard hook
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(
        "buildertools-publish-dashboard-owner-filter-99999",
      );
    }
  });

  test("TEST-DASHBOARD-1: Row selection toggle via checkbox click", async () => {
    mockFetch([{ body: mockEntities, url: "/api/publish/dashboard" }]);
    renderWithProviders(<PublishDashboard />);
    const user = userEvent.setup();

    // Wait for entities to load
    const row = await screen.findByRole("row", { name: /room 1000/i });
    const checkbox = within(row).getByRole("checkbox");

    // Initially unchecked
    expect(checkbox.dataset["state"]).toBe("unchecked");

    // Click to select
    await user.click(checkbox);
    await waitFor(() => {
      expect(checkbox.dataset["state"]).toBe("checked");
    });

    // Click again to deselect
    await user.click(checkbox);
    await waitFor(() => {
      expect(checkbox.dataset["state"]).toBe("unchecked");
    });
  });

  test("TEST-DASHBOARD-2: Header checkbox shows indeterminate state when some-but-not-all selected", async () => {
    mockFetch([{ body: mockEntities, url: "/api/publish/dashboard" }]);
    renderWithProviders(<PublishDashboard />);
    const user = userEvent.setup();

    // Wait for entities to load
    const row = await screen.findByRole("row", { name: /room 1000/i });

    // Select just one row (but not all)
    const rowCheckbox = within(row).getByRole("checkbox");
    await user.click(rowCheckbox);

    // After selecting some-but-not-all, the "N selected" text appears.
    // The header checkbox is directly to its left. We can verify the
    // indeterminate state by checking that exactly one checkbox in the
    // document has data-state="indeterminate".
    await waitFor(() => {
      expect(screen.getByText(/1 selected/)).toBeDefined();
    });

    // The header checkbox is the only one with data-state="indeterminate".
    // Use getAllByRole and filter by attribute to find it.
    const allCheckboxes = screen.getAllByRole("checkbox");
    const indeterminateCheckboxes = allCheckboxes.filter(
      (cb) => cb.dataset["state"] === "indeterminate",
    );
    expect(indeterminateCheckboxes).toHaveLength(1);
  });

  test("TEST-DASHBOARD-3: Switching owner filter clears selection", async () => {
    mockFetch([{ body: mockEntities, url: "/api/publish/dashboard" }]);
    renderWithProviders(<PublishDashboard />);
    const user = userEvent.setup();

    // Wait for entities to load
    const row = await screen.findByRole("row", { name: /room 1000/i });
    const rowCheckbox = within(row).getByRole("checkbox");

    // Select one row
    await user.click(rowCheckbox);
    await waitFor(() => {
      expect(rowCheckbox.dataset["state"]).toBe("checked");
    });

    // Should show "1 selected" text
    expect(screen.getByText(/1 selected/)).toBeDefined();

    // Click "All" to switch owner filter
    const allButton = screen.getByRole("button", { name: "All" });
    await user.click(allButton);

    // Selection should be cleared - no "selected" text
    await waitFor(() => {
      expect(screen.queryByText(/selected/)).toBeNull();
    });
  });

  test("TEST-DASHBOARD-4: Bulk publish opens confirm dialog", async () => {
    mockFetch([
      { body: mockEntities, url: "/api/publish/dashboard" },
      { body: { ok: true }, url: "/api/publish/bulk" },
    ]);
    renderWithProviders(<PublishDashboard />);
    const user = userEvent.setup();

    // Wait for entities to load, then select a row
    const row = await screen.findByRole("row", { name: /room 1000/i });
    const rowCheckbox = within(row).getByRole("checkbox");
    await user.click(rowCheckbox);

    // Click the "Publish Selected" button
    const publishButton = await screen.findByRole("button", {
      name: /publish selected/i,
    });
    await user.click(publishButton);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(
        screen.getByText(/this will publish .* to production/i),
      ).toBeDefined();
    });

    // Cancel should close the dialog
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/this will publish .* to production/i),
      ).toBeNull();
    });
  });

  test("TEST-DASHBOARD-5: Empty state message when no entities", async () => {
    mockFetch([{ body: [], url: "/api/publish/dashboard" }]);
    renderWithProviders(<PublishDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText("All entities are in sync with production."),
      ).toBeDefined();
    });
  });

  test("TEST-DASHBOARD-6: Error state when dashboard fetch fails", async () => {
    mockFetch([
      {
        body: { error: "Internal server error" },
        status: 500,
        url: "/api/publish/dashboard",
      },
    ]);
    renderWithProviders(<PublishDashboard />);

    // QueryStatus renders an alert with the error message
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });

  test("TEST-DASHBOARD-7: multi-owner same-vnum rendered as two rows with distinct selection", async () => {
    setAuth([POWER.BUILDER, POWER.LOW], { isSenior: true });
    mockFetch([
      {
        body: [
          {
            name: "r1",
            owner: "a",
            playerId: 1,
            status: "modified",
            type: "room",
            vnum: 100,
          },
          {
            name: "r1",
            owner: "b",
            playerId: 2,
            status: "modified",
            type: "room",
            vnum: 100,
          },
        ] satisfies DashboardEntity[],
        url: "/api/publish/dashboard",
      },
    ]);
    renderWithProviders(<PublishDashboard />);
    const user = userEvent.setup();

    // Wait for both rows to appear (both have aria-label "room 100")
    const rows = await waitFor(() => {
      const r = screen.getAllByRole("row", { name: /room 100/i });
      expect(r).toHaveLength(2);
      return r;
    });

    const [firstRow, secondRow] = rows;
    if (!firstRow || !secondRow) throw new Error("Expected 2 rows");
    const firstCheckbox = within(firstRow).getByRole("checkbox");
    const secondCheckbox = within(secondRow).getByRole("checkbox");

    // Both start unchecked
    expect(firstCheckbox.dataset["state"]).toBe("unchecked");
    expect(secondCheckbox.dataset["state"]).toBe("unchecked");

    // Click first checkbox only
    await user.click(firstCheckbox);
    await waitFor(() => {
      expect(firstCheckbox.dataset["state"]).toBe("checked");
    });

    // Second checkbox remains unchecked - independent selection
    expect(secondCheckbox.dataset["state"]).toBe("unchecked");
  });

  test("TEST-DASHBOARD-LS-FALLBACK: non-senior with stored 'all' normalizes to 'mine'", async () => {
    localStorage.setItem(
      "buildertools-publish-dashboard-owner-filter-99999",
      "all",
    );
    setAuth([POWER.BUILDER, POWER.LOW], { isSenior: false });
    mockFetch([{ body: [], url: "/api/publish/dashboard" }]);
    renderWithProviders(<PublishDashboard />);

    // Wait for the component to render and normalize localStorage
    await waitFor(() => {
      expect(
        screen.getByText("All entities are in sync with production."),
      ).toBeDefined();
    });

    expect(
      localStorage.getItem("buildertools-publish-dashboard-owner-filter-99999"),
    ).toBe("mine");

    localStorage.removeItem(
      "buildertools-publish-dashboard-owner-filter-99999",
    );
  });

  test("TEST-DASHBOARD-LS-PRESERVE-SENIOR: senior with stored 'all' is preserved", async () => {
    localStorage.setItem(
      "buildertools-publish-dashboard-owner-filter-99998",
      "all",
    );
    setAuth([POWER.BUILDER, POWER.LOW], { isSenior: true, playerId: 99_998 });
    mockFetch([
      { body: [], url: "/api/publish/dashboard?owner=all" },
      { body: [], url: "/api/publish/dashboard" },
    ]);
    renderWithProviders(<PublishDashboard />);

    // Wait for the component to render
    await waitFor(() => {
      expect(
        screen.getByText("All entities are in sync with production."),
      ).toBeDefined();
    });

    expect(
      localStorage.getItem("buildertools-publish-dashboard-owner-filter-99998"),
    ).toBe("all");

    localStorage.removeItem(
      "buildertools-publish-dashboard-owner-filter-99998",
    );
  });
});
