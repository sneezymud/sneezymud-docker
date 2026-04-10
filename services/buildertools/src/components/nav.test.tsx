// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "bun:test";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import { useDirtyStore } from "@/state/dirty.ts";
import {
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { Nav } from "./nav.tsx";

function setAuth(
  powers: number[],
  overrides: Partial<{ isSenior: boolean }> = {},
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

describe("Nav", () => {
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ user: null });
    useDirtyStore.setState({ dirty: false });
    resetFetchMock();
  });

  test("Publish nav link hidden for non-senior (no POWER_LOW/NO_LIMITS/WIZARD)", async () => {
    // BUILDER only - no senior powers, no publish capability.
    setAuth([POWER.BUILDER], { isSenior: false });
    renderWithProviders(<Nav />);

    // Wait for the nav to render (router needs a tick to initialize)
    await waitFor(() => {
      expect(screen.getByText("Rooms")).toBeDefined();
    });

    expect(screen.queryByText(/publish/i)).toBeNull();
  });

  test("Publish nav link visible for senior with POWER_LOW", async () => {
    setAuth([POWER.BUILDER, POWER.LOW], { isSenior: true });
    renderWithProviders(<Nav />);

    await waitFor(() => {
      expect(screen.getByText(/publish/i)).toBeDefined();
    });
  });

  test("displays user info", async () => {
    setAuth([POWER.BUILDER]);
    renderWithProviders(<Nav />);

    await waitFor(() => {
      expect(screen.getByText("TestBuilder")).toBeDefined();
    });
    expect(screen.getByText("testbuilder")).toBeDefined();
  });

  test("Log out button visible and functional", async () => {
    setAuth([POWER.BUILDER]);
    mockFetch([{ body: { ok: true }, url: "/api/auth/logout" }]);
    renderWithProviders(<Nav />);

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Log out")).toBeDefined();
    });

    await user.click(screen.getByText("Log out"));

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  test("logout with unsaved changes shows confirmation dialog", async () => {
    setAuth([POWER.BUILDER]);
    renderWithProviders(<Nav />);
    useDirtyStore.setState({ dirty: true });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Log out")).toBeDefined();
    });

    await user.click(screen.getByText("Log out"));

    await waitFor(() => {
      expect(screen.getByText("Unsaved Changes")).toBeDefined();
    });
    expect(
      screen.getByText(
        "You have unsaved changes that will be lost if you log out.",
      ),
    ).toBeDefined();

    // Dialog should have both confirm and cancel actions
    const dialogButtons = screen.getAllByRole("button");
    const logoutButton = dialogButtons.find(
      (btn) => btn.textContent === "Log out",
    );
    const cancelButton = dialogButtons.find(
      (btn) => btn.textContent === "Cancel",
    );
    expect(logoutButton).toBeDefined();
    expect(cancelButton).toBeDefined();
  });

  test("confirming logout with unsaved changes clears auth and dismisses dialog", async () => {
    setAuth([POWER.BUILDER]);
    mockFetch([{ body: { ok: true }, url: "/api/auth/logout" }]);
    renderWithProviders(<Nav />);
    useDirtyStore.setState({ dirty: true });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Log out")).toBeDefined();
    });

    // Click "Log out" to trigger the confirmation dialog
    await user.click(screen.getByText("Log out"));

    await waitFor(() => {
      expect(screen.getByText("Unsaved Changes")).toBeDefined();
    });

    // Find the confirm "Log out" button inside the dialog.
    // There are two "Log out" texts - the nav button and the dialog confirm.
    const dialogButtons = screen.getAllByRole("button");
    const confirmLogout = dialogButtons.find(
      (btn) => btn.textContent === "Log out",
    );
    if (!confirmLogout) throw new Error("Confirm logout button not found");

    await user.click(confirmLogout);

    // Auth store should be cleared
    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  test("canceling logout confirmation dismisses dialog", async () => {
    setAuth([POWER.BUILDER]);
    renderWithProviders(<Nav />);
    useDirtyStore.setState({ dirty: true });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Log out")).toBeDefined();
    });

    await user.click(screen.getByText("Log out"));

    await waitFor(() => {
      expect(screen.getByText("Unsaved Changes")).toBeDefined();
    });

    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Unsaved Changes")).toBeNull();
    });
  });
});
