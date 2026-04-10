// e2e/access-control.test.ts

// Reuse the shared auth fixture (testbuilder with blocks 100-199)
import { z } from "zod";

import { expect, test } from "./auth-fixture.ts";

const vnumListSchema = z.array(z.object({ vnum: z.number().int() }));

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
    for (let i = 0; i < rowCount; i++) {
      const label = await rows.nth(i).getAttribute("aria-label");
      if (label) {
        const vnumMatch = /vnum (\d+)/.exec(label);
        if (vnumMatch) {
          const vnum = Number(vnumMatch[1]);
          expect(
            vnum,
            `${linkName} list rendered out-of-range vnum ${vnum}`,
          ).toBeGreaterThanOrEqual(100);
          expect(
            vnum,
            `${linkName} list rendered out-of-range vnum ${vnum}`,
          ).toBeLessThanOrEqual(199);
        }
      }
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
