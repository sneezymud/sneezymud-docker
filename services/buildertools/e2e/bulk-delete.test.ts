// e2e/bulk-delete.test.ts

import { expect, test } from "./auth-fixture.ts";

test("bulk delete removes selected rooms from list", async ({
  authenticatedPage: page,
}) => {
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms$/);

  // Create 3 rooms
  for (const vnum of [140, 141, 142]) {
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("spinbutton").fill(String(vnum));
    await page.keyboard.press("Enter");
    await page.waitForURL(new RegExp(`/rooms/${vnum}`));
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms$/);
  }

  // Verify all 3 appear in the list - match exact link text to avoid partial hits
  await expect(page.getByRole("link", { name: "140" })).toBeVisible();
  await expect(page.getByRole("link", { name: "141" })).toBeVisible();
  await expect(page.getByRole("link", { name: "142" })).toBeVisible();

  // Select all on this page (SelectAllCheckbox aria-label)
  await page.getByRole("checkbox", { name: "Select all on this page" }).click();

  // Click the bulk delete button - text is "Delete {count}" from DeleteSelectionBar
  await page.getByRole("button", { name: /delete \d/i }).click();

  // ConfirmDialog uses confirmLabel="Delete" from room-list.tsx
  // The dialog title is "Confirm Bulk Delete" so we scope to avoid the trigger button
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();

  // Wait for the list to update - all 3 vnums should no longer be present
  await expect(page.getByRole("link", { name: "140" })).toBeHidden();
  await expect(page.getByRole("link", { name: "141" })).toBeHidden();
  await expect(page.getByRole("link", { name: "142" })).toBeHidden();
});
