// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { ObjListItem } from "@/shared/schemas/obj.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { ObjectList } from "./object-list.tsx";

function setAuthObjects() {
  useAuthStore.setState({
    user: {
      blocks: [{ end: 1099, start: 1000 }],
      isSenior: false,
      playerId: 99_999,
      playerName: "TestBuilder",
      powers: [POWER.BUILDER, POWER.OEDIT],
      username: "testbuilder",
    },
  });
}

const mockObjects: ObjListItem[] = [
  {
    name: "sword keywords",
    short_desc: "a rusty iron sword",
    type: 5,
    vnum: 1000,
  },
  {
    name: "shield keywords",
    short_desc: "a battered wooden shield",
    type: 8,
    vnum: 1001,
  },
  {
    name: "potion keywords",
    short_desc: "a glowing blue potion",
    type: 10,
    vnum: 1002,
  },
];

describe("ObjectList (EntityList)", () => {
  beforeEach(() => {
    setAuthObjects();
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("renders object vnums and short descriptions in table", async () => {
    mockFetch([{ body: mockObjects, url: "/api/objects" }]);
    renderWithProviders(
      <ObjectList
        from={undefined}
        to={undefined}
      />,
    );

    // ObjectList maps short_desc as the display name
    const table = await screen.findByRole("table");
    expect(within(table).getByText("a rusty iron sword")).toBeDefined();
    expect(within(table).getByText("a battered wooden shield")).toBeDefined();
    expect(within(table).getByText("a glowing blue potion")).toBeDefined();

    // Vnums appear as links
    expect(within(table).getByRole("link", { name: "1000" })).toBeDefined();
    expect(within(table).getByRole("link", { name: "1001" })).toBeDefined();
    expect(within(table).getByRole("link", { name: "1002" })).toBeDefined();
  });

  test("client-side search filters the list", async () => {
    mockFetch([{ body: mockObjects, url: "/api/objects" }]);
    renderWithProviders(
      <ObjectList
        from={undefined}
        to={undefined}
      />,
    );
    const user = userEvent.setup();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("a rusty iron sword")).toBeDefined();

    const searchInput = screen.getByPlaceholderText(
      "Search by vnum or name...",
    );
    await user.type(searchInput, "potion");

    await waitFor(() => {
      expect(within(table).getByText("a glowing blue potion")).toBeDefined();
      expect(within(table).queryByText("a rusty iron sword")).toBeNull();
      expect(within(table).queryByText("a battered wooden shield")).toBeNull();
    });
  });
});
