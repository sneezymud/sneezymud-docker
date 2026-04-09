// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
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

const VNUM = "1000";
const BASE_POWERS = [POWER.BUILDER, POWER.REDIT, POWER.RSAVE, POWER.EDIT];

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

/** DiffButton renders in both mobile and desktop EntityHeader. Return the first. */
function getDiffButton(): HTMLElement {
  const buttons = screen.getAllByRole("button", {
    name: /compare with production|diff/i,
  });
  // getAllByRole throws if empty, so the first element is always present.
  const first = buttons[0];
  if (!first) throw new Error("No diff button found");
  return first;
}

const originalFetch = globalThis.fetch;

describe("DiffSheet (via RoomEditor)", () => {
  beforeEach(() => {
    setAuth(BASE_POWERS);
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("TEST-DIFFSHEET-1: Loading spinner visible while diff is fetching", async () => {
    // Use a manually-controlled promise for the diff endpoint so we can
    // assert the loading state before it resolves.
    let resolveDiff!: (value: Response) => void;
    const diffPromise = new Promise<Response>((resolve) => {
      resolveDiff = resolve;
    });

    globalThis.fetch = Object.assign(
      (input: RequestInfo | URL): Promise<Response> => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.includes("/api/publish/diff/rooms/")) {
          return diffPromise;
        }
        if (url.includes(`/api/rooms/${VNUM}`)) {
          return Promise.resolve(Response.json(makeRoom()));
        }
        if (url.includes("/api/zones")) {
          return Promise.resolve(Response.json(mockZones));
        }
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      },
      { preconnect: originalFetch.preconnect },
    );

    renderWithProviders(<RoomEditor vnumParam={VNUM} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeDefined();
    });

    // Click the diff button to trigger fetch
    await user.click(getDiffButton());

    // Loading text should be visible while the promise is pending
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeDefined();
    });

    // Resolve the promise to clean up
    resolveDiff(
      Response.json({
        immortal: makeRoom(),
        production: makeRoom(),
      }),
    );
  });

  test("TEST-DIFFSHEET-2: Error state when diff fetch fails", async () => {
    mockFetch([
      { body: makeRoom(), url: `/api/rooms/${VNUM}` },
      { body: mockZones, url: "/api/zones" },
      {
        body: { error: "Internal server error" },
        status: 500,
        url: "/api/publish/diff/rooms/",
      },
    ]);

    renderWithProviders(<RoomEditor vnumParam={VNUM} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeDefined();
    });

    await user.click(getDiffButton());

    await waitFor(() => {
      expect(screen.getByText(/failed to load diff/i)).toBeDefined();
    });
  });

  test("TEST-DIFFSHEET-3: EntityDiff renders field rows when diff data arrives", async () => {
    const immortalRoom = makeRoom({ name: "Modified Room" });
    const productionRoom = makeRoom({ name: "Original Room" });

    mockFetch([
      { body: makeRoom(), url: `/api/rooms/${VNUM}` },
      { body: mockZones, url: "/api/zones" },
      {
        body: { immortal: immortalRoom, production: productionRoom },
        url: "/api/publish/diff/rooms/",
      },
    ]);

    renderWithProviders(<RoomEditor vnumParam={VNUM} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeDefined();
    });

    await user.click(getDiffButton());

    // EntityDiff renders the diff fields. "Modified Room" is only in the diff,
    // not in the editor form, so its presence proves EntityDiff rendered.
    await waitFor(() => {
      expect(screen.getByText("Modified Room")).toBeDefined();
    });
    expect(screen.getByText("Original Room")).toBeDefined();
  });

  test("TEST-DIFFSHEET-4: Publish button hidden when canPublish === false", async () => {
    // No POWER.LOW, no isSenior - canPublish is false
    setAuth([POWER.BUILDER, POWER.REDIT, POWER.RSAVE, POWER.EDIT]);

    const immortalRoom = makeRoom();
    const productionRoom = makeRoom({ name: "Production Version" });

    mockFetch([
      { body: makeRoom(), url: `/api/rooms/${VNUM}` },
      { body: mockZones, url: "/api/zones" },
      {
        body: { immortal: immortalRoom, production: productionRoom },
        url: "/api/publish/diff/rooms/",
      },
    ]);

    renderWithProviders(<RoomEditor vnumParam={VNUM} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeDefined();
    });

    await user.click(getDiffButton());

    // Wait for diff data to render inside the sheet. The sheet title is an
    // h2 heading - wait for that to confirm the sheet opened with data.
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Compare with Production" }),
      ).toBeDefined();
    });

    // Publish button should not be present
    expect(screen.queryByText("Publish to Production")).toBeNull();
  });

  test("TEST-DIFFSHEET-5: Publish button hidden when immortal == null", async () => {
    // Grant publish permission so we can isolate the null-immortal condition
    setAuth([...BASE_POWERS, POWER.LOW], { isSenior: true });

    mockFetch([
      { body: makeRoom(), url: `/api/rooms/${VNUM}` },
      { body: mockZones, url: "/api/zones" },
      {
        body: { immortal: null, production: makeRoom() },
        url: "/api/publish/diff/rooms/",
      },
    ]);

    renderWithProviders(<RoomEditor vnumParam={VNUM} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeDefined();
    });

    await user.click(getDiffButton());

    // Wait for diff data to render - EntityDiff shows this text for null immortal
    await waitFor(() => {
      expect(
        screen.getByText(/exists in production but not in builder workspace/i),
      ).toBeDefined();
    });

    // Publish button should not be present even though canPublish is true
    expect(screen.queryByText("Publish to Production")).toBeNull();
  });

  test("TEST-DIFFSHEET-6: Confirm dialog opens on Publish click and closes on Cancel", async () => {
    // Grant publish permission
    setAuth([...BASE_POWERS, POWER.LOW], { isSenior: true });

    const immortalRoom = makeRoom({ name: "Modified" });
    const productionRoom = makeRoom({ name: "Original" });

    mockFetch([
      { body: makeRoom(), url: `/api/rooms/${VNUM}` },
      { body: mockZones, url: "/api/zones" },
      {
        body: { immortal: immortalRoom, production: productionRoom },
        url: "/api/publish/diff/rooms/",
      },
    ]);

    renderWithProviders(<RoomEditor vnumParam={VNUM} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeDefined();
    });

    await user.click(getDiffButton());

    // Wait for the publish button to appear
    const publishButton = await screen.findByRole("button", {
      name: /publish to production/i,
    });
    await user.click(publishButton);

    // Confirm dialog should be open with the expected message
    await waitFor(() => {
      expect(
        screen.getByText(/this will overwrite the production version/i),
      ).toBeDefined();
    });

    // Click Cancel to close the dialog
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Confirm dialog should be closed
    await waitFor(() => {
      expect(
        screen.queryByText(/this will overwrite the production version/i),
      ).toBeNull();
    });
  });

  test("TEST-DIFFSHEET-7: After successful publish, diff endpoint is refetched", async () => {
    setAuth([...BASE_POWERS, POWER.LOW], { isSenior: true });

    const fetchLog: string[] = [];
    globalThis.fetch = Object.assign(
      (input: RequestInfo | URL): Promise<Response> => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        fetchLog.push(url);
        if (url.includes("/api/publish/rooms/")) {
          return Promise.resolve(Response.json({ ok: true }));
        }
        if (url.includes("/api/publish/diff/rooms/")) {
          return Promise.resolve(
            Response.json({
              immortal: makeRoom({ name: "Draft" }),
              production: makeRoom({ name: "Live" }),
            }),
          );
        }
        if (url.includes(`/api/rooms/${VNUM}`)) {
          return Promise.resolve(Response.json(makeRoom()));
        }
        if (url.includes("/api/zones")) {
          return Promise.resolve(Response.json(mockZones));
        }
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      },
      { preconnect: originalFetch.preconnect },
    );

    try {
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      fireEvent.click(getDiffButton());

      const publishButton = await screen.findByRole("button", {
        name: /publish to production/i,
      });
      fireEvent.click(publishButton);

      // Wait for the confirm dialog, then click Publish
      await waitFor(() => {
        expect(
          screen.getByText(/this will overwrite the production version/i),
        ).toBeDefined();
      });
      const confirmButton = screen.getByRole("button", { name: "Publish" });
      fireEvent.click(confirmButton);

      // Wait until the diff endpoint has been fetched at least twice
      // (initial open + refetch after successful publish)
      await waitFor(() => {
        const diffHits = fetchLog.filter((u) =>
          u.includes("/api/publish/diff/rooms/"),
        );
        expect(diffHits.length).toBeGreaterThanOrEqual(2);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("TEST-DIFFSHEET-8: After publish failure (500), diff endpoint is also refetched", async () => {
    setAuth([...BASE_POWERS, POWER.LOW], { isSenior: true });

    const fetchLog: string[] = [];
    globalThis.fetch = Object.assign(
      (input: RequestInfo | URL): Promise<Response> => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        fetchLog.push(url);
        if (url.includes("/api/publish/rooms/")) {
          return Promise.resolve(
            Response.json({ error: "Server error" }, { status: 500 }),
          );
        }
        if (url.includes("/api/publish/diff/rooms/")) {
          return Promise.resolve(
            Response.json({
              immortal: makeRoom({ name: "Draft" }),
              production: makeRoom({ name: "Live" }),
            }),
          );
        }
        if (url.includes(`/api/rooms/${VNUM}`)) {
          return Promise.resolve(Response.json(makeRoom()));
        }
        if (url.includes("/api/zones")) {
          return Promise.resolve(Response.json(mockZones));
        }
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      },
      { preconnect: originalFetch.preconnect },
    );

    try {
      renderWithProviders(<RoomEditor vnumParam={VNUM} />);

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeDefined();
      });

      fireEvent.click(getDiffButton());

      const publishButton = await screen.findByRole("button", {
        name: /publish to production/i,
      });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(
          screen.getByText(/this will overwrite the production version/i),
        ).toBeDefined();
      });
      const confirmButton = screen.getByRole("button", { name: "Publish" });
      fireEvent.click(confirmButton);

      // Even on failure, onError should refetch the diff endpoint
      await waitFor(() => {
        const diffHits = fetchLog.filter((u) =>
          u.includes("/api/publish/diff/rooms/"),
        );
        expect(diffHits.length).toBeGreaterThanOrEqual(2);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
