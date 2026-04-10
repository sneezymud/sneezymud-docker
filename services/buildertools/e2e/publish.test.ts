// e2e/publish.test.ts

import { expect, test } from "./auth-fixture.ts";

const SEED_VNUM = 150;
const API_HEADERS = { "X-Requested-With": "XMLHttpRequest" };

test.describe("publish workflow", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    // Clean up the seeded room (may already be gone if publish succeeded)
    try {
      await authenticatedPage.request.delete(`/api/rooms/${SEED_VNUM}`, {
        headers: API_HEADERS,
      });
    } catch {
      // Already deleted or published
    }
  });

  test("senior publishes testbuilder room and it leaves the pending list", async ({
    authenticatedPage,
    seniorPage: page,
  }) => {
    // Seed a room as testbuilder so it appears as pending in the dashboard
    const createRes = await authenticatedPage.request.post("/api/rooms", {
      data: { vnum: SEED_VNUM },
      headers: API_HEADERS,
    });
    expect(createRes.status()).toBe(201);

    // Navigate to publish dashboard
    await page.getByRole("link", { name: "Publish" }).click();
    await page.waitForURL(/\/publish/);

    // Switch to "All" view to see testbuilder's entities
    await page.getByRole("button", { name: /^all$/i }).click();

    // Wait for the entity row to appear
    const entityRow = page.getByRole("row", { name: /room 150/i });
    await expect(entityRow).toBeVisible();

    // Select the entity via its checkbox
    await entityRow.getByRole("checkbox").click();

    // Click the "Publish Selected" button
    await page.getByRole("button", { name: /publish selected/i }).click();

    // Confirm in the alert dialog
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Publish" })
      .click();

    // Verify the entity is no longer in the pending list
    await expect(entityRow).toBeHidden();
  });
});
