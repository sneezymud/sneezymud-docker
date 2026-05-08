import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { DashboardEntity } from "@/shared/schemas/publish.ts";

import { Toaster } from "@/components/ui/sonner.tsx";
import { POWER } from "@/shared/powers.ts";
import {
  getFetchLog,
  mockFetch,
  renderWithProviders,
  resetTestState,
  setTestAuth,
} from "@/test-helpers-component.tsx";

import { PublishDashboard } from "./publish-dashboard.tsx";

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
    setTestAuth(SENIOR_POWERS, { isSenior: true });
  });

  afterEach(() => {
    resetTestState();
    // Clean up localStorage entries set by the dashboard hook
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(
        "buildertools-publish-dashboard-owner-filter-99999",
      );
    }
  });

  test("renders permission denied message when canPublish is false", async () => {
    setTestAuth([POWER.BUILDER], { isSenior: false });
    renderWithProviders(<PublishDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText("You do not have permission to publish."),
      ).toBeDefined();
    });

    // Publish UI should not be rendered
    expect(screen.queryByText("Publish to Production")).toBeNull();
  });

  test("Row selection toggle via checkbox click", async () => {
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

  test("Header checkbox shows indeterminate state when some-but-not-all selected", async () => {
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

  test("Switching owner filter clears selection", async () => {
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

  test("Bulk publish opens confirm dialog", async () => {
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

  test("confirming bulk publish triggers publish and closes dialog", async () => {
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

    // Click the "Publish" confirm button
    const confirmButton = screen.getByRole("button", { name: "Publish" });
    await user.click(confirmButton);

    // Dialog should close after successful publish
    await waitFor(() => {
      expect(
        screen.queryByText(/this will publish .* to production/i),
      ).toBeNull();
    });

    // No error alerts should be present
    expect(screen.queryByRole("alert")).toBeNull();

    // Verify the bulk publish request was sent with correct payload shape
    const postCall = getFetchLog().find(
      (c) => c.method === "POST" && c.url.includes("/api/publish/bulk"),
    );
    if (!postCall) throw new Error("expected POST to /api/publish/bulk");
    expect(postCall.body).toEqual(
      expect.objectContaining({
        entities: [
          expect.objectContaining({
            ownerPlayerId: 99_999,
            type: "room",
            vnum: 1000,
          }),
        ],
      }),
    );
  });

  test("bulk publish error is surfaced to the user", async () => {
    mockFetch([
      { body: mockEntities, url: "/api/publish/dashboard" },
      {
        body: { error: "Publish failed unexpectedly" },
        status: 500,
        url: "/api/publish/bulk",
      },
    ]);
    renderWithProviders(
      <>
        <PublishDashboard />
        <Toaster />
      </>,
    );
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

    // Click the "Publish" confirm button
    const confirmButton = screen.getByRole("button", { name: "Publish" });
    await user.click(confirmButton);

    // Error should be surfaced via toast
    await waitFor(() => {
      expect(screen.getByText("Publish failed unexpectedly")).toBeDefined();
    });
  });

  test("Empty state message when no entities", async () => {
    mockFetch([{ body: [], url: "/api/publish/dashboard" }]);
    renderWithProviders(<PublishDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText("All entities are in sync with production."),
      ).toBeDefined();
    });
  });

  test("Error state when dashboard fetch fails", async () => {
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

  test("multi-owner same-vnum rendered as two rows with distinct selection", async () => {
    setTestAuth([POWER.BUILDER, POWER.LOW], { isSenior: true });
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

  test("non-senior with stored 'all' normalizes to 'mine'", async () => {
    localStorage.setItem(
      "buildertools-publish-dashboard-owner-filter-99999",
      "all",
    );
    setTestAuth([POWER.BUILDER, POWER.LOW], { isSenior: false });
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

  test("senior with stored 'all' is preserved", async () => {
    localStorage.setItem(
      "buildertools-publish-dashboard-owner-filter-99998",
      "all",
    );
    setTestAuth([POWER.BUILDER, POWER.LOW], {
      isSenior: true,
      playerId: 99_998,
    });
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
