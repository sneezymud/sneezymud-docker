// e2e/obj-create-edit-save.test.ts
import { expect, test } from "./auth-fixture.ts";

test.describe("object create-edit-save", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    try {
      await page.request.delete("/api/objects/198", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    } catch {
      // Entity may not exist, cleanup is best-effort
    }
  });

  test("create, edit, save, and verify object persistence", async ({
    authenticatedPage: page,
  }) => {
    // Navigate to Objects via sidebar
    await page.getByRole("link", { name: "Objects" }).click();
    await page.waitForURL(/\/objects/);

    // Create object at vnum 198
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("spinbutton").fill("198");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/objects\/198/);

    // Fill fields
    // NOTE: Object "name" field has label "Keywords" (not "Name") per obj-fields.tsx
    const nameInput = page.getByLabel("Keywords");
    await nameInput.fill("test iron sword");

    const shortDescInput = page.getByLabel("Short Description");
    await shortDescInput.fill("a test iron sword");

    // Long Description is required by use-object-editor's validator (along
    // with Keywords + Short Description). Without it, save is blocked.
    await page
      .getByLabel("Long Description")
      .fill("A test iron sword lies here.");

    // Select weapon type (type 5) via Combobox (not native select - too many
    // item types triggers SearchableEnumSelect). Use focus() instead of
    // click() to bypass pointer-event interception by the EntityHeader
    // sticky top-bar (z-10 with backdrop-blur). The combobox opens its
    // listbox on focus + typing, matching real keyboard-driven UX.
    const typeCombobox = page.getByLabel("Item Type");
    await typeCombobox.focus();
    await typeCombobox.fill("Weapon");
    await page.getByRole("option", { name: /Weapon/ }).click();

    // Fill a weapon-specific value field. After selecting Weapon, the form
    // renders type-specific fields: "Current Sharpness", "Max Sharpness",
    // "Damage Level", etc. These are number inputs within the same
    // "Type-Specific Values" section (already expanded).
    const damageLevelInput = page.getByLabel("Damage Level");
    await damageLevelInput.fill("50");

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
    await expect(page.getByLabel("Item Type")).toHaveValue("Weapon (5)");
    await expect(page.getByLabel("Damage Level")).toHaveValue("50");
    await expect(page.getByLabel("Weight")).toHaveValue("10");
  });
});
