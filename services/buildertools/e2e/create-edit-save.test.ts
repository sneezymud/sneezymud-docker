// e2e/create-edit-save.test.ts

import { expect, test } from "./auth-fixture.ts";

test("save failure surfaces error and preserves dirty state", async ({
  authenticatedPage: page,
}) => {
  // Create a room to work with
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms/);
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("spinbutton").fill("197");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/rooms\/197/);

  // Edit a field so the form becomes dirty
  const nameInput = page.getByLabel("Name");
  await nameInput.fill("doomed room");

  // Intercept the PUT to simulate a server error
  await page.route("**/api/rooms/197", (route) => {
    if (route.request().method() === "PUT") {
      return route.fulfill({
        body: JSON.stringify({ error: "Database connection lost" }),
        contentType: "application/json",
        status: 500,
      });
    }
    return route.continue();
  });

  // Click Save
  const saveButton = page.getByRole("button", { name: "Save" });
  await saveButton.click();

  // Error should be visible to the user (sonner toast)
  await expect(page.getByText("Database connection lost")).toBeVisible();

  // Save button should still be enabled (dirty state preserved)
  await expect(saveButton).toBeEnabled();

  // Remove the route intercept so cleanup works
  await page.unroute("**/api/rooms/197");

  // Clean up: revert the name and delete the room
  await nameInput.clear();
  await nameInput.fill("cleanup");
  await saveButton.click();
  await expect(saveButton).toBeDisabled();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForURL(/\/rooms$/);
});

test("create, edit, save, and verify room persistence", async ({
  authenticatedPage: page,
}) => {
  // Navigate to rooms via the sidebar nav
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms/);

  // Open the VnumPicker (triggerLabel="Add")
  await page.getByRole("button", { name: "Add" }).click();

  // Fill the vnum input. Number inputs have implicit role "spinbutton".
  await page.getByRole("spinbutton").fill("198");

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

  // Expand the "Properties" section (collapsed by default)
  await page.getByRole("button", { name: "Properties" }).click();

  // Select sector type via searchable combobox (>15 entries = SearchableEnumSelect).
  // Same interaction pattern as Item Type in the object test.
  const sectorCombobox = page.getByLabel("Sector Type");
  await sectorCombobox.click();
  await sectorCombobox.fill("Temperate Building");
  await page.getByRole("option", { name: /Temperate Building/ }).click();

  // Fill Max Capacity (number input)
  const capacityInput = page.getByLabel("Max Capacity");
  await capacityInput.fill("5");

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
  await expect(page.getByLabel("Description")).toHaveValue(
    "A long hallway stretches before you.",
  );

  // Expand Properties to verify enum and number fields
  await page.getByRole("button", { name: "Properties" }).click();
  await expect(page.getByLabel("Sector Type")).toHaveValue(
    "Temperate Building (32)",
  );
  await expect(page.getByLabel("Max Capacity")).toHaveValue("5");

  // Clean up: delete the room via the icon button (aria-label="Delete")
  await page.getByRole("button", { name: "Delete" }).click();
  // Confirm deletion dialog (confirmLabel: "Yes, delete")
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForURL(/\/rooms$/);
});
