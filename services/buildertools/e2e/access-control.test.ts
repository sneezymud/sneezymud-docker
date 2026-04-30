// e2e/access-control.test.ts

// Reuse the shared auth fixture (testbuilder with blocks 100-199)
import { z } from "zod";

import { expect, test } from "./auth-fixture.ts";

const vnumListSchema = z.array(z.object({ vnum: z.number().int() }));

const SEED_VNUM = 155;
const API_HEADERS = { "X-Requested-With": "XMLHttpRequest" };

// Pulled out of the test body so the conditionals don't trip
// playwright/no-conditional-in-test. Each EntityRow's aria-label looks like
// "(unnamed) (vnum 250)" - return the parsed number, or undefined if the row
// has no label or the label has no vnum segment.
function parseVnumFromLabel(label: null | string): number | undefined {
  if (label === null) return undefined;
  const match = /vnum (\d+)/.exec(label);
  return match ? Number(match[1]) : undefined;
}

test.beforeEach(async ({ authenticatedPage: page }) => {
  // The first test reads each entity list and asserts at least one vnum is
  // visible (vacuous-pass guard). Seed one entity per type via API so the
  // assertions have data to match. Cleanup runs in afterEach.
  for (const path of ["/api/rooms", "/api/mobs", "/api/objects"]) {
    const res = await page.request.post(path, {
      data: { vnum: SEED_VNUM },
      headers: API_HEADERS,
    });
    expect(res.status()).toBe(201);
  }
  // Reload so the list pages refetch and render the new rows.
  await page.reload();
});

test.afterEach(async ({ authenticatedPage: page }) => {
  for (const path of ["/api/rooms", "/api/mobs", "/api/objects"]) {
    try {
      await page.request.delete(`${path}/${SEED_VNUM}`, {
        headers: API_HEADERS,
      });
    } catch {
      // Already deleted
    }
  }
});

test("builder sees no entities outside their vnum blocks", async ({
  authenticatedPage: page,
}) => {
  // Navigate to each list page and verify the rendered DOM contains no
  // out-of-range vnums, then confirm via API as a belt-and-suspenders check.

  const entityPages = [
    { apiEndpoint: "/api/rooms", linkName: "Rooms" },
    { apiEndpoint: "/api/mobs", linkName: "Mobs" },
    { apiEndpoint: "/api/objects", linkName: "Objects" },
  ] as const;

  for (const { apiEndpoint, linkName } of entityPages) {
    await page.getByRole("link", { name: linkName }).click();
    await page.waitForURL(new RegExp(`/${linkName.toLowerCase()}`));

    // DOM assertion: check that no rendered table rows contain out-of-range vnums.
    // Each EntityRow has aria-label like "(unnamed) (vnum 250)".
    const rows = page
      .getByRole("row")
      .filter({ hasNot: page.getByRole("columnheader") });
    const rowCount = await rows.count();
    const labels = await Promise.all(
      Array.from({ length: rowCount }, (_, i) =>
        rows.nth(i).getAttribute("aria-label"),
      ),
    );
    const extractedVnums = labels
      .map(parseVnumFromLabel)
      .filter((v): v is number => v !== undefined);

    // Guard: ensure we actually found vnums to check (prevents vacuous pass)
    expect(
      extractedVnums.length,
      `${linkName} list should contain at least one vnum in DOM`,
    ).toBeGreaterThan(0);

    for (const vnum of extractedVnums) {
      expect(
        vnum,
        `${linkName} list rendered out-of-range vnum ${vnum}`,
      ).toBeGreaterThanOrEqual(100);
      expect(
        vnum,
        `${linkName} list rendered out-of-range vnum ${vnum}`,
      ).toBeLessThanOrEqual(199);
    }

    // API assertion (existing): verify via fetch as well
    const raw: unknown = await page.evaluate(async (url: string) => {
      const res = await fetch(url, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const body: unknown = await res.json();
      return body;
    }, apiEndpoint);

    const items = vnumListSchema.parse(raw);

    // Guard: ensure API returned data (prevents vacuous pass)
    expect(
      items.length,
      `${apiEndpoint} should return at least one item`,
    ).toBeGreaterThan(0);

    for (const { vnum } of items) {
      expect(
        vnum,
        `${apiEndpoint} returned out-of-range vnum ${vnum}`,
      ).toBeGreaterThanOrEqual(100);
      expect(
        vnum,
        `${apiEndpoint} returned out-of-range vnum ${vnum}`,
      ).toBeLessThanOrEqual(199);
    }
  }
});

test("direct navigation to out-of-range vnum shows error", async ({
  authenticatedPage: page,
}) => {
  // NOTE: This is a justified exception to the click-based navigation pattern.
  // There is no in-app link to an out-of-range entity, and no form is loaded
  // with unsaved changes at test start, so the unsaved-changes dialog won't fire.
  await page.goto("/rooms/250");

  // The API returns 403 for vnums outside the builder's blocks (100-199).
  // QueryStatus renders the error in a destructive Alert.
  await expect(page.getByText("Vnum outside assigned blocks")).toBeVisible();

  // The room editor form should not be rendered
  await expect(page.getByLabel("Name")).toBeHidden();
});
