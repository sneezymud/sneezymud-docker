// e2e/unsaved-changes.test.ts

import { expect, test } from "./auth-fixture.ts";

test.describe("unsaved changes dialog", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create a room to edit
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("spinbutton").fill("197");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/rooms\/197/);
  });

  test.afterEach(async ({ authenticatedPage: page }) => {
    try {
      await page.request.delete("/api/rooms/197", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    } catch {
      // Room may not exist, that's ok
    }
  });

  test("cancel preserves the edit", async ({ authenticatedPage: page }) => {
    // Make an edit. Use #name to avoid the rooms list locator collision
    // during route transition (search input + row aria-labels match "Name").
    const nameInput = page.locator("#name");
    await nameInput.fill("unsaved edit");

    // Try to navigate away. From inside the editor, sidebar + breadcrumb
    // both have a "Rooms" link, so use exact + first to target the sidebar.
    await page
      .getByRole("link", { exact: true, name: "Rooms" })
      .first()
      .click();

    // UnsavedChangesDialog should appear with "Cancel" and "Discard changes" buttons
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should still be on the edit page with our changes
    await expect(page).toHaveURL(/\/rooms\/197/);
    await expect(nameInput).toHaveValue("unsaved edit");
  });

  test("confirm discards the edit", async ({ authenticatedPage: page }) => {
    // Make an edit
    const nameInput = page.locator("#name");
    await nameInput.fill("will be discarded");

    // Try to navigate away (sidebar Rooms link, disambiguated from breadcrumb)
    await page
      .getByRole("link", { exact: true, name: "Rooms" })
      .first()
      .click();

    // UnsavedChangesDialog: click "Discard changes" (confirmLabel)
    await page.getByRole("button", { name: "Discard changes" }).click();

    // Should have navigated to the rooms list
    await expect(page).toHaveURL(/\/rooms$/);
  });

  test("save and continue saves then navigates", async ({
    authenticatedPage: page,
  }) => {
    // Make an edit. Description must also be filled - it's a required field
    // and applyValidation() blocks the save if any required field is empty,
    // surfacing a "Required fields cannot be empty" toast and preventing
    // navigation.
    const nameInput = page.locator("#name");
    await nameInput.fill("saved before leaving");
    await page.locator("#description").fill("placeholder description");

    // Try to navigate away (sidebar Rooms link, disambiguated from breadcrumb)
    await page
      .getByRole("link", { exact: true, name: "Rooms" })
      .first()
      .click();

    // UnsavedChangesDialog: click "Save & continue"
    await page.getByRole("button", { name: "Save & continue" }).click();

    // Should navigate to the rooms list after saving
    await expect(page).toHaveURL(/\/rooms$/);

    // Navigate back to verify the save persisted. Once a room has a name,
    // its row contains two links (vnum + name) both linking to /rooms/197 -
    // grab the vnum link explicitly to avoid a strict-mode collision.
    await page.getByRole("link", { exact: true, name: "197" }).click();
    await expect(page).toHaveURL(/\/rooms\/197/);
    await expect(page.locator("#name")).toHaveValue("saved before leaving");
  });
});
