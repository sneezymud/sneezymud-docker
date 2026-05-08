import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { POWER } from "@/shared/powers.ts";
import {
  makeMob,
  makeMobResponse,
  mockFetch,
  renderWithProviders,
  resetTestState,
  setTestAuth,
} from "@/test-helpers-component.tsx";

import { MobResponseEditor } from "./mob-response-editor.tsx";

const VNUM = "1000";

describe("MobResponseEditor", () => {
  beforeEach(() => {
    setTestAuth([POWER.BUILDER, POWER.MEDIT]);
  });

  afterEach(resetTestState);

  test("renders breadcrumb with mob short_desc once loaded", async () => {
    mockFetch([
      {
        body: makeMobResponse({ response: 'say {"hello";}' }),
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
        body: makeMobResponse(),
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
        body: makeMobResponse(),
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
