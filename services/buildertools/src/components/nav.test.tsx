// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import { renderWithProviders } from "@/test-helpers-component.tsx";

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
  });

  test("TEST-NAV-1a: Publish nav link hidden for non-senior (no POWER_LOW/NO_LIMITS/WIZARD)", async () => {
    // BUILDER only - no senior powers, no publish capability.
    setAuth([POWER.BUILDER], { isSenior: false });
    renderWithProviders(<Nav />);

    // Wait for the nav to render (router needs a tick to initialize)
    await waitFor(() => {
      expect(screen.getByText("Rooms")).toBeDefined();
    });

    expect(screen.queryByText(/publish/i)).toBeNull();
  });

  test("TEST-NAV-1b: Publish nav link visible for senior with POWER_LOW", async () => {
    setAuth([POWER.BUILDER, POWER.LOW], { isSenior: true });
    renderWithProviders(<Nav />);

    await waitFor(() => {
      expect(screen.getByText(/publish/i)).toBeDefined();
    });
  });
});
