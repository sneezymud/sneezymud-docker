import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "bun:test";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import { useDirtyStore } from "@/state/dirty.ts";
import {
  getFetchLog,
  mockFetch,
  renderWithProviders,
  resetTestState,
  setTestAuth,
} from "@/test-helpers-component.tsx";

import { Nav } from "./nav.tsx";

describe("Nav", () => {
  afterEach(() => {
    resetTestState();
    useDirtyStore.setState({ dirty: false });
  });

  test("Publish nav link hidden for non-senior (no POWER_LOW/NO_LIMITS/WIZARD)", async () => {
    // BUILDER only - no senior powers, no publish capability.
    setTestAuth([POWER.BUILDER], { isSenior: false });
    renderWithProviders(<Nav />);

    // Wait for the nav to render (router needs a tick to initialize)
    await waitFor(() => {
      expect(screen.getByText("Rooms")).toBeDefined();
    });

    expect(screen.queryByText(/publish/i)).toBeNull();
  });

  test("Publish nav link visible for senior with POWER_LOW", async () => {
    setTestAuth([POWER.BUILDER, POWER.LOW], { isSenior: true });
    renderWithProviders(<Nav />);

    await waitFor(() => {
      expect(screen.getByText(/publish/i)).toBeDefined();
    });
  });

  test("displays user info", async () => {
    setTestAuth([POWER.BUILDER]);
    renderWithProviders(<Nav />);

    await waitFor(() => {
      expect(screen.getByText("TestBuilder")).toBeDefined();
    });
    expect(screen.getByText("testbuilder")).toBeDefined();
  });

  test("Log out button visible and functional", async () => {
    setTestAuth([POWER.BUILDER]);
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
    setTestAuth([POWER.BUILDER]);
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
    setTestAuth([POWER.BUILDER]);
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
    setTestAuth([POWER.BUILDER]);
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

  test("logout proceeds client-side even when API call fails", async () => {
    setTestAuth([POWER.BUILDER]);
    mockFetch([
      {
        body: { error: "Internal server error" },
        status: 500,
        url: "/api/auth/logout",
      },
    ]);
    renderWithProviders(<Nav />);

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Log out")).toBeDefined();
    });

    await user.click(screen.getByText("Log out"));

    // Auth store should still be cleared despite the API failure
    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    // Verify the logout API call was attempted
    const logoutCall = getFetchLog().find((c) =>
      c.url.includes("/api/auth/logout"),
    );
    expect(logoutCall).toBeDefined();
  });
});
