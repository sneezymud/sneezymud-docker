// e2e/obj-create-edit-save.test.ts
import { expect, test } from "./auth-fixture.ts";

test("create, edit, save, and verify object persistence", async ({
  authenticatedPage: page,
}) => {
  // Navigate to Objects via sidebar
  await page.getByRole("link", { name: "Objects" }).click();
  await page.waitForURL(/\/objects/);

  // Create object at vnum 198
  await page.getByRole("button", { name: "Add" }).click();
  await page.locator('input[type="number"]').fill("198");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/objects\/198/);

  // Fill fields
  // NOTE: Object "name" field has label "Keywords" (not "Name") per obj-fields.tsx
  const nameInput = page.getByLabel("Keywords");
  await nameInput.fill("test iron sword");

  const shortDescInput = page.getByLabel("Short Description");
  await shortDescInput.fill("a test iron sword");

  // Select weapon type (type 5) via Combobox (not native select - too many
  // item types triggers SearchableEnumSelect). Click to open, type to filter,
  // click option.
  const typeCombobox = page.getByLabel("Item Type");
  await typeCombobox.click();
  await typeCombobox.fill("Weapon");
  await page.getByRole("option", { name: /Weapon/ }).click();

  // Fill weight
  const weightInput = page.getByLabel("Weight");
  await weightInput.fill("10");

  // Save
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

  // Navigate away and back
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms/);
  await page.getByRole("link", { name: "Objects" }).click();
  await page.waitForURL(/\/objects$/);
  await page.getByRole("link", { name: /198/ }).click();
  await page.waitForURL(/\/objects\/198/);

  // Verify persistence
  await expect(page.getByLabel("Keywords")).toHaveValue("test iron sword");
  await expect(page.getByLabel("Short Description")).toHaveValue(
    "a test iron sword",
  );
  await expect(page.getByLabel("Weight")).toHaveValue("10");

  // Delete
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForURL(/\/objects$/);
});
