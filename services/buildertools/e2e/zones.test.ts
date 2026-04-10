import { expect, test } from "./auth-fixture.ts";

test.describe("zones page", () => {
  test("zones list displays and is read-only", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("link", { name: "Zones" }).click();
    await page.waitForURL(/\/zones/);

    // Verify table with data
    await expect(page.getByRole("table")).toBeVisible();
    const rows = page.getByRole("row");
    await expect(rows).not.toHaveCount(0);

    // Verify read-only (no Add button)
    await expect(page.getByRole("button", { name: "Add" })).toBeHidden();
  });
});
