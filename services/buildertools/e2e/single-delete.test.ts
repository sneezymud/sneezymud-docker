// e2e/single-delete.test.ts
//
// Complements bulk-delete.test.ts by exercising the single-entity delete
// flow from the editor page: confirmation dialog -> redirect to list ->
// list no longer contains the row -> direct navigation shows not-found.

import { expect, test } from "./auth-fixture.ts";

const VNUM = 148;
const API_HEADERS = { "X-Requested-With": "XMLHttpRequest" };

test.describe("single-entity delete from editor", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    try {
      await page.request.delete(`/api/mobs/${VNUM}`, {
        headers: API_HEADERS,
      });
    } catch {
      // Already deleted by the test, best-effort cleanup
    }
  });

  test("deleting a mob from the editor redirects to the list and removes the row", async ({
    authenticatedPage: page,
  }) => {
    // Seed: create the mob via API so the test focuses on the delete flow.
    const createRes = await page.request.post("/api/mobs", {
      data: { vnum: VNUM },
      headers: API_HEADERS,
    });
    expect(createRes.status()).toBe(201);

    // Navigate via the list page to keep cache state consistent - the list
    // query loads, then the row click navigates into the editor.
    await page.getByRole("link", { name: "Mobs" }).click();
    await page.waitForURL(/\/mobs$/);
    await expect(page.getByRole("link", { name: String(VNUM) })).toBeVisible();
    await page.getByRole("link", { name: String(VNUM) }).click();
    await page.waitForURL(new RegExp(`/mobs/${VNUM}`));

    // Click Delete in the editor header, then confirm in the alert dialog.
    await page.getByRole("button", { name: "Delete" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Yes, delete" })
      .click();

    // Redirect to the list page.
    await page.waitForURL(/\/mobs$/);

    // The row is gone from the list after delete.
    await expect(page.getByRole("link", { name: String(VNUM) })).toBeHidden();

    // Direct navigation to the deleted vnum must not serve stale cache data.
    // The editor shows a not-found / error state instead of the old values.
    await page.goto(`/mobs/${VNUM}`);
    await expect(
      page.getByText(/not found|unable to load|error/i).first(),
    ).toBeVisible();
  });
});
