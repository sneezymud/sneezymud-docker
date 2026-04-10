// e2e/mob-create-edit-save.test.ts
import { expect, test } from "./auth-fixture.ts";

test("create, edit, save, and verify mob persistence", async ({
  authenticatedPage: page,
}) => {
  // Navigate to Mobs via sidebar
  await page.getByRole("link", { name: "Mobs" }).click();
  await page.waitForURL(/\/mobs/);

  // Open VnumPicker and create mob at vnum 198
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("spinbutton").fill("198");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/mobs\/198/);

  // Fill fields across categories
  // NOTE: Mob "name" field has label "Keywords" (not "Name") per mob-fields.tsx
  const nameInput = page.getByLabel("Keywords");
  await nameInput.fill("test goblin warrior");

  const shortDescInput = page.getByLabel("Short Description");
  await shortDescInput.fill("a test goblin warrior");

  await page
    .getByLabel("Long Description")
    .fill("A goblin warrior stands here.");
  await page
    .getByLabel("Detailed Description")
    .fill("A fierce goblin warrior.");

  const levelInput = page.getByLabel("Level", { exact: true });
  await levelInput.fill("10");

  // Expand the "Physical" section (collapsed by default)
  await page.getByRole("button", { name: "Physical" }).click();

  // Select Race via searchable combobox (>15 entries = SearchableEnumSelect).
  // Same interaction pattern as Item Type in the object test.
  const raceCombobox = page.getByLabel("Race");
  await raceCombobox.click();
  await raceCombobox.fill("Ogre");
  await page.getByRole("option", { name: /Ogre/ }).click();

  // Save
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

  // Navigate away and back
  await page.getByRole("link", { name: "Rooms" }).click();
  await page.waitForURL(/\/rooms/);
  await page.getByRole("link", { name: "Mobs" }).click();
  await page.waitForURL(/\/mobs$/);
  await page.getByRole("link", { name: /198/ }).click();
  await page.waitForURL(/\/mobs\/198/);

  // Verify persistence
  await expect(page.getByLabel("Keywords")).toHaveValue("test goblin warrior");
  await expect(page.getByLabel("Short Description")).toHaveValue(
    "a test goblin warrior",
  );
  await expect(page.getByLabel("Long Description")).toHaveValue(
    "A goblin warrior stands here.",
  );
  await expect(page.getByLabel("Detailed Description")).toHaveValue(
    "A fierce goblin warrior.",
  );
  await expect(page.getByLabel("Level", { exact: true })).toHaveValue("10");

  // Expand Physical to verify Race persisted
  await page.getByRole("button", { name: "Physical" }).click();
  await expect(page.getByLabel("Race")).toHaveValue("Ogre (6)");

  // Delete
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForURL(/\/mobs$/);
});
