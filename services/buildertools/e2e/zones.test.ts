import { expect, test } from "./auth-fixture.ts";

test.describe("zones page", () => {
  test("zones list displays and is read-only", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("link", { name: "Zones" }).click();
    await page.waitForURL(/\/zones/);

    // Page rendered (not a loading/error state). zones-page.tsx renders a
    // div-based list (not a <table>), so assert the heading + seeded data
    // instead of getByRole("table").
    await expect(
      page.getByRole("heading", { level: 2, name: "Zones" }),
    ).toBeVisible();

    // The test-preload seeds exactly one zone ("Test Zone" / zone_nr 1).
    await expect(page.getByText("Test Zone")).toBeVisible();

    // Read-only banner.
    await expect(page.getByText(/read-only/i)).toBeVisible();

    // No Add button (zones are managed by the game server).
    await expect(page.getByRole("button", { name: "Add" })).toBeHidden();
  });
});
