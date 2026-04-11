// eslint-disable-next-line testing-library/no-manual-cleanup -- Bun runs all test files in one process; explicit cleanup prevents cross-file DOM leaks
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { Mob } from "@/shared/schemas/mob.ts";

import { POWER } from "@/shared/powers.ts";
import { useAuthStore } from "@/state/auth.ts";
import {
  mockFetch,
  renderWithProviders,
  resetFetchMock,
} from "@/test-helpers-component.tsx";

import { MobResponseEditor } from "./mob-response-editor.tsx";

const VNUM = "1000";

function makeMob(overrides: Partial<Mob> = {}): Mob {
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
    description: "A test mob stands here.",
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
    name: "testmob",
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

function setAuth(powers: number[] = [POWER.BUILDER, POWER.MEDIT]) {
  useAuthStore.setState({
    user: {
      blocks: [{ end: 1099, start: 1000 }],
      isSenior: false,
      playerId: 99_999,
      playerName: "TestBuilder",
      powers,
      username: "testbuilder",
    },
  });
}

describe("MobResponseEditor", () => {
  beforeEach(() => {
    setAuth();
  });

  afterEach(() => {
    cleanup();
    resetFetchMock();
    useAuthStore.setState({ user: null });
  });

  test("renders breadcrumb with mob short_desc once loaded", async () => {
    mockFetch([
      {
        body: { response: 'say {"hello";}', vnum: 1000 },
        url: `/api/mob-responses/${VNUM}`,
      },
      {
        body: makeMob({ short_desc: "a dusty troll" }),
        url: `/api/mobs/${VNUM}`,
      },
    ]);
    renderWithProviders(<MobResponseEditor vnumParam={VNUM} />);

    // Once the mob and response queries resolve, the breadcrumb shows the
    // mob's short_desc. This is the primary visible evidence that the
    // component has loaded successfully (the CodeMirror editor's inner DOM
    // is hard to reach from happy-dom but the surrounding chrome is not).
    await waitFor(() => {
      expect(screen.getByText("a dusty troll")).toBeDefined();
    });
  });

  test("fallback label is 'Mob <vnum>' when short_desc is empty", async () => {
    mockFetch([
      {
        body: { response: "", vnum: 1000 },
        url: `/api/mob-responses/${VNUM}`,
      },
      { body: makeMob({ short_desc: "" }), url: `/api/mobs/${VNUM}` },
    ]);
    renderWithProviders(<MobResponseEditor vnumParam={VNUM} />);

    await waitFor(() => {
      expect(screen.getByText("Mob 1000")).toBeDefined();
    });
  });

  test("shows error state when the response fetch fails", async () => {
    mockFetch([
      {
        body: { error: "Internal server error" },
        status: 500,
        url: `/api/mob-responses/${VNUM}`,
      },
      { body: makeMob(), url: `/api/mobs/${VNUM}` },
    ]);
    renderWithProviders(<MobResponseEditor vnumParam={VNUM} />);

    // QueryStatus renders an Alert with role="alert" when the response
    // query errors. No attempt to reach into CodeMirror is made here.
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });

  test("renders the syntax reference accordion", async () => {
    mockFetch([
      {
        body: { response: "", vnum: 1000 },
        url: `/api/mob-responses/${VNUM}`,
      },
      { body: makeMob(), url: `/api/mobs/${VNUM}` },
    ]);
    renderWithProviders(<MobResponseEditor vnumParam={VNUM} />);

    await waitFor(() => {
      expect(screen.getByText("Syntax Reference")).toBeDefined();
    });
    // Verify the section titles are present so a future refactor that drops
    // them is caught. These live inside accordion triggers.
    for (const title of [
      "Triggers",
      "Actions",
      "Variables",
      "Color Codes",
      "Flow Control",
    ]) {
      expect(screen.getByText(title)).toBeDefined();
    }
  });
});
