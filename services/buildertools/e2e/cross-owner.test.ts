// e2e/cross-owner.test.ts

import { expect, test } from "./auth-fixture.ts";

test("senior cross-owner happy path: edit testbuilder's room as expandedbuilder", async ({
  expandedPage: page,
}) => {
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
});
