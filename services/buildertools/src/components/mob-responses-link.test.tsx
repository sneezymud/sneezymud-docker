import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";

import {
  makeMobResponse,
  mockFetch,
  renderWithProviders,
  resetTestState,
} from "@/test-helpers-component.tsx";

import { MobResponsesLink } from "./mob-responses-link.tsx";

const VNUM = 1234;

describe("MobResponsesLink", () => {
  afterEach(resetTestState);

  test("does not show link text while loading", async () => {
    // Never-resolving fetch keeps the query in the loading state.
    const fetchPreconnect = globalThis.fetch.preconnect;
    globalThis.fetch = Object.assign(
      (): Promise<Response> => new Promise((_resolve) => void _resolve),
      { preconnect: fetchPreconnect },
    );

    renderWithProviders(
      <MobResponsesLink
        owner={undefined}
        vnum={VNUM}
      />,
    );

    // After a tick, the component has rendered the loading skeleton (no link).
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("Add Mob Response")).toBeNull();
    expect(screen.queryByText("Edit Mob Responses")).toBeNull();
  });

  test("shows 'Add Mob Response' when response is empty", async () => {
    mockFetch([
      {
        body: makeMobResponse({ vnum: VNUM }),
        method: "GET",
        url: `/api/mob-responses/${VNUM}`,
      },
    ]);

    renderWithProviders(
      <MobResponsesLink
        owner={undefined}
        vnum={VNUM}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Add Mob Response")).toBeDefined();
    });
  });

  test("shows 'Edit Mob Responses' when response has content", async () => {
    mockFetch([
      {
        body: makeMobResponse({
          response: 'say {"hello"; smile;}',
          vnum: VNUM,
        }),
        method: "GET",
        url: `/api/mob-responses/${VNUM}`,
      },
    ]);

    renderWithProviders(
      <MobResponsesLink
        owner={undefined}
        vnum={VNUM}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Edit Mob Responses")).toBeDefined();
    });
  });
});
