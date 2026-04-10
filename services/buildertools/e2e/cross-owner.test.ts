// e2e/cross-owner.test.ts

import { expect, test } from "./auth-fixture.ts";

const SEED_VNUM = 150;

test("senior cross-owner happy path: edit testbuilder's room as expandedbuilder", async ({
  authenticatedPage,
  expandedPage: page,
}) => {
  // Seed: create a room as testbuilder so expandedbuilder has something to find.
  const createRes = await authenticatedPage.request.post("/api/rooms", {
    data: { vnum: SEED_VNUM },
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  expect(createRes.status()).toBe(201);

  try {
    // Expand to "All" view so cross-owner rooms appear.
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);

    // Senior toggle - rendered only when user.isSenior
    await page.getByRole("button", { name: /^all$/i }).click();

    // Click a room row belonging to testbuilder (vnum in the 100-199 block).
    // The list row must surface the owner column after the toggle.
    await page
      .getByRole("row")
      .filter({ hasText: /TestBuilder/i })
      .first()
      .getByRole("link")
      .first()
      .click();

    // The URL should be /rooms/<vnum>?owner=<testUser.playerId>
    await expect(page).toHaveURL(/\/rooms\/\d+\?owner=\d+/);

    // Edit the name field and save
    const nameInput = page.getByRole("textbox", { name: /^name$/i });
    await nameInput.click();
    await nameInput.fill("edited by senior");
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/^saved$/i)).toBeVisible();

    // Header should show "Owned by TestBuilder"
    await expect(page.getByText(/Owned by TestBuilder/i)).toBeVisible();

    // Navigate away and return to verify persistence
    await page.getByRole("link", { name: "Rooms" }).click();
    // Dismiss unsaved changes dialog if it appears (save already completed)
    await page.waitForURL(/\/rooms/);

    // Switch back to All view and re-open the same room
    await page.getByRole("button", { name: /^all$/i }).click();
    await page
      .getByRole("row")
      .filter({ hasText: /TestBuilder/i })
      .first()
      .getByRole("link")
      .first()
      .click();
    await expect(page).toHaveURL(/\/rooms\/\d+\?owner=\d+/);

    // Verify the name persisted
    const nameAfterReload = page.getByRole("textbox", { name: /^name$/i });
    await expect(nameAfterReload).toHaveValue("edited by senior");
  } finally {
    // Cleanup: delete the seeded room as testbuilder regardless of test outcome.
    await authenticatedPage.request.delete(`/api/rooms/${SEED_VNUM}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
  }
});
