// Shared utilities for component integration tests.

import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { expect } from "bun:test";

import type { SessionUser } from "@/shared/schemas/auth.ts";
import type { MobResponse } from "@/shared/schemas/mob-response.ts";
import type { Mob } from "@/shared/schemas/mob.ts";
import type { Obj } from "@/shared/schemas/obj.ts";
import type { Room } from "@/shared/schemas/room.ts";
import type { Zone } from "@/shared/schemas/zone.ts";

import { useAuthStore } from "@/state/auth.ts";

export interface FetchCall {
  body: unknown;
  method: string;
  url: string;
}

interface FetchHandler {
  body: unknown;
  method?: string;
  status?: number;
  url: string;
}

let fetchLog: FetchCall[] = [];

export function getFetchLog(): FetchCall[] {
  return fetchLog;
}

/**
 * Find the first logged fetch call matching the given method, throwing if
 * absent. Convenience wrapper around `getFetchLog().find(...)` for assertion
 * sites that always expect the call to exist.
 */
export function findFetchCall(method: string): FetchCall {
  const call = fetchLog.find((c) => c.method === method);
  if (!call) throw new Error(`expected ${method} call in fetch log`);
  return call;
}

/**
 * Render a component wrapped in the providers needed for most components
 * to function (QueryClientProvider + RouterProvider). Creates fresh
 * instances per call to avoid shared state between tests.
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createTestRouter(queryClient, ui);

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/**
 * Create a minimal TanStack Router for tests. Components use useBlocker(),
 * useNavigate(), etc. which require a RouterProvider in the tree.
 * The root route renders an Outlet which displays children.
 */
function createTestRouter(queryClient: QueryClient, element: ReactElement) {
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: Outlet,
  });
  const indexRoute = createRoute({
    component: () => element,
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const routeTree = rootRoute.addChildren([indexRoute]);
  return createRouter({
    context: { queryClient },
    defaultNotFoundComponent: () => <p>Not Found</p>,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree,
  });
}

const originalFetch = globalThis.fetch;

/**
 * Mock globalThis.fetch with predetermined responses. Matches by URL
 * substring - first matching handler wins. Unmatched URLs throw.
 */
export function mockFetch(handlers: FetchHandler[]) {
  fetchLog = [];
  globalThis.fetch = Object.assign(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = init?.method ?? "GET";
      let body: unknown = undefined;
      if (init?.body !== undefined && init.body !== null) {
        try {
          body = JSON.parse(typeof init.body === "string" ? init.body : "");
        } catch {
          body = init.body;
        }
      }
      fetchLog.push({ body, method, url });
      const handler = handlers.find(
        (h) => url.includes(h.url) && (!h.method || h.method === method),
      );
      if (!handler) {
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      }
      return Promise.resolve(
        Response.json(handler.body, {
          status: handler.status ?? 200,
        }),
      );
    },
    { preconnect: originalFetch.preconnect },
  );
}

/** Restore the original fetch after tests. */
export function resetFetchMock() {
  globalThis.fetch = originalFetch;
  fetchLog = [];
}

/**
 * Standard `afterEach` body for component tests: tear down the DOM, restore
 * the original fetch, and clear the auth store. Use as `afterEach(resetTestState)`
 * in test files that don't need additional teardown.
 */
export function resetTestState() {
  cleanup();
  resetFetchMock();
  useAuthStore.setState({ user: null });
}

/**
 * Set the auth store to a test builder session with the given powers and
 * optional field overrides. Default identity has vnum block 1000-1099,
 * isSenior=false, and the standard TestBuilder name/playerId.
 */
export function setTestAuth(
  powers: number[],
  overrides: Partial<SessionUser> = {},
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

/** Minimal valid Mob for API mock responses. Override fields as needed. */
export function makeMob(overrides: Partial<Mob> = {}): Mob {
  return {
    ac: 10,
    actions: 0,
    adjacent_sound: "",
    affects: 0,
    agi: 0,
    attacks: 1,
    bra: 0,
    can_be_seen: 0,
    cha: 0,
    class: 0,
    con: 0,
    damage_level: 1,
    damage_precision: 50,
    def_position: 8,
    description: "A test mob stands here looking menacing.",
    dex: 0,
    extras: [],
    fact_perc: 0,
    faction: 0,
    foc: 0,
    gold: 1,
    height: 72,
    hpbonus: 1,
    immunities: [],
    intel: 0,
    kar: 0,
    level: 10,
    local_sound: "",
    long_desc: "A test mob stands here.",
    max_exist: 9999,
    name: "test mob keywords",
    per: 0,
    race: 0,
    sex: 1,
    short_desc: "a test mob",
    skin: 0,
    spe: 0,
    spec_proc: 0,
    str: 0,
    tohit: 0,
    vision: 0,
    vnum: 1000,
    weight: 150,
    wis: 0,
    ...overrides,
  };
}

/** Minimal valid MobResponse for API mock responses. Override fields as needed. */
export function makeMobResponse(
  overrides: Partial<MobResponse> = {},
): MobResponse {
  return { response: "", vnum: 1000, ...overrides };
}

/** Minimal valid Obj for API mock responses. Override fields as needed. */
export function makeObj(overrides: Partial<Obj> = {}): Obj {
  return {
    action_desc: "",
    action_flag: 0,
    affects: [],
    can_be_seen: 0,
    cur_struct: 100,
    decay: -1,
    extras: [],
    long_desc: "A test object lies here.",
    material: 0,
    max_exist: 9999,
    max_struct: 100,
    name: "test object",
    price: 500,
    short_desc: "a test object",
    spec_proc: 0,
    type: 0,
    val0: 0,
    val1: 0,
    val2: 0,
    val3: 0,
    vnum: 1000,
    volume: 100,
    wear_flag: 0,
    weight: 5,
    ...overrides,
  };
}

/**
 * Wait for an entity editor's first field label to render. Use the field
 * label that's expected to appear once the entity-fetch query resolves
 * (e.g., "Keywords" for mob/object editors, "Name" for the room editor).
 */
export async function waitForEditorReady(label: string) {
  await waitFor(() => {
    expect(screen.getByText(label)).toBeDefined();
  });
}

/** Wait for the editor's Save button to become enabled (form became dirty). */
export async function waitForSaveEnabled(saveButton: HTMLElement) {
  await waitFor(() => {
    expect(saveButton.hasAttribute("disabled")).toBe(false);
  });
}

/** Wait for the editor's Save button to become disabled (form is clean). */
export async function waitForSaveDisabled(saveButton: HTMLElement) {
  await waitFor(() => {
    expect(saveButton.hasAttribute("disabled")).toBe(true);
  });
}

/** Minimal valid Room for API mock responses. Override fields as needed. */
export function makeRoom(overrides: Partial<Room> = {}): Room {
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

/** Minimal valid Zone for API mock responses. Override fields as needed. */
export function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    age: null,
    bottom: null,
    lifespan: null,
    reset_mode: null,
    top: null,
    util_flag: null,
    zone_enabled: 0,
    zone_name: "Test Zone",
    zone_nr: 1,
    ...overrides,
  };
}
