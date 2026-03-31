// e2e/create-edit-save.test.ts

import { expect, test } from "./auth-fixture.ts";

test("create, edit, save, and verify room persistence", async ({
  authenticatedPage: page,
}) => {
  // Navigate to rooms via the sidebar nav
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms/);

  // Open the VnumPicker (triggerLabel="Add")
  await page.getByRole("button", { name: "Add" }).click();

  // Fill the vnum input. The placeholder is dynamic ("Next available: N" or
  // "Enter vnum") so we locate by type within the popover/sheet instead.
  await page.locator('input[type="number"]').fill("198");

  // Submit via Enter - the form's onSubmit handles creation
  await page.keyboard.press("Enter");

  // Should navigate to the room editor
  await page.waitForURL(/\/rooms\/198/);

  // Edit the room name (label "Name" from room-fields.tsx)
  const nameInput = page.getByLabel("Name");
  await nameInput.fill("test room hallway");

  // Edit the description (label "Description" from room-fields.tsx)
  const descInput = page.getByLabel("Description");
  await descInput.fill("A long hallway stretches before you.");

  // Save
  await page.getByRole("button", { name: "Save" }).click();

  // Wait for save to complete - Save button is disabled when not dirty
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

  // Navigate away via nav
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms$/);

  // Navigate back to the room by clicking its vnum link in the list
  await page.getByRole("link", { name: /198/ }).click();
  await page.waitForURL(/\/rooms\/198/);

  // Verify values persisted
  await expect(page.getByLabel("Name")).toHaveValue("test room hallway");

  // Clean up: delete the room via the icon button (aria-label="Delete")
  await page.getByRole("button", { name: "Delete" }).click();
  // Confirm deletion dialog (confirmLabel: "Yes, delete")
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForURL(/\/rooms$/);
});
