// e2e/unsaved-changes.test.ts

import { expect, test } from "./auth-fixture.ts";

test.describe("unsaved changes dialog", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create a room to edit
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);
    await page.getByRole("button", { name: "Add" }).click();
    await page.locator('input[type="number"]').fill("197");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/rooms\/197/);
  });

  test.afterEach(async ({ authenticatedPage: page }) => {
    // Clean up - navigate to the room and delete it
    try {
      await page.goto("/rooms/197");
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Yes, delete" }).click();
    } catch {
      // Room may not exist, that's ok
    }
  });

  test("cancel preserves the edit", async ({ authenticatedPage: page }) => {
    // Make an edit
    const nameInput = page.getByLabel("Name");
    await nameInput.fill("unsaved edit");

    // Try to navigate away
    await page.getByRole("link", { name: "Rooms" }).click();

    // UnsavedChangesDialog should appear with "Cancel" and "Discard changes" buttons
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should still be on the edit page with our changes
    await expect(page).toHaveURL(/\/rooms\/197/);
    await expect(nameInput).toHaveValue("unsaved edit");
  });

  test("confirm discards the edit", async ({ authenticatedPage: page }) => {
    // Make an edit
    const nameInput = page.getByLabel("Name");
    await nameInput.fill("will be discarded");

    // Try to navigate away
    await page.getByRole("link", { name: "Rooms" }).click();

    // UnsavedChangesDialog: click "Discard changes" (confirmLabel)
    await page.getByRole("button", { name: "Discard changes" }).click();

    // Should have navigated to the rooms list
    await expect(page).toHaveURL(/\/rooms$/);
  });
});
