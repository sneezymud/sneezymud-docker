// e2e/access-control.test.ts

// Reuse the shared auth fixture (testbuilder with blocks 100-199)
import { z } from "zod";

import { expect, test } from "./auth-fixture.ts";

const vnumListSchema = z.array(z.object({ vnum: z.number().int() }));

test("builder sees no entities outside their vnum blocks", async ({
  authenticatedPage: page,
}) => {
  // Navigate to each list page to confirm the UI loads without errors
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms/);

  await page.getByRole("link", { name: "Mobs" }).click();
  await page.waitForURL(/\/mobs/);

  await page.getByRole("link", { name: "Objects" }).click();
  await page.waitForURL(/\/objects/);

  // Verify the API directly: all returned entities must be within testbuilder's
  // vnum block (100-199). expandedbuilder (blocks 200-299) may have created
  // entities in other tests, so we're confirming isolation, not merely emptiness.
  for (const endpoint of ["/api/rooms", "/api/mobs", "/api/objects"]) {
    const raw: unknown = await page.evaluate(async (url: string) => {
      const res = await fetch(url, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const body: unknown = await res.json();
      return body;
    }, endpoint);

    const items = vnumListSchema.parse(raw);

    for (const { vnum } of items) {
      expect(
        vnum,
        `${endpoint} returned out-of-range vnum ${vnum}`,
      ).toBeGreaterThanOrEqual(100);
      expect(
        vnum,
        `${endpoint} returned out-of-range vnum ${vnum}`,
      ).toBeLessThanOrEqual(199);
    }
  }
});
