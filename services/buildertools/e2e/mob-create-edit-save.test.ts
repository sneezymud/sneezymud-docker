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
  await page.locator('input[type="number"]').fill("198");
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
  await expect(page.getByLabel("Level", { exact: true })).toHaveValue("10");

  // Delete
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForURL(/\/mobs$/);
});
