// e2e/bitfield-flags.test.ts
import { expect, test } from "./auth-fixture.ts";

test.describe("bitfield flag editing", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    try {
      await page.request.delete("/api/rooms/186", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    } catch {
      // Room may not exist
    }
  });

  test("toggling a room flag persists after save", async ({
    authenticatedPage: page,
  }) => {
    // Create room via API
    await page.request.post("/api/rooms", {
      data: { vnum: 186 },
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    // Navigate to room
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);
    await page.getByRole("link", { name: "186" }).click();
    await page.waitForURL(/\/rooms\/186/);

    // Expand the "Room Flags" section (collapsed by default)
    await page.getByRole("button", { name: "Room Flags" }).click();

    // Toggle the "Peaceful" flag (bit 4 - prevents combat in the room)
    const flagCheckbox = page.getByLabel("Peaceful");
    await flagCheckbox.check();

    // Save
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

    // Navigate away and back
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms$/);
    await page.getByRole("link", { name: "186" }).click();
    await page.waitForURL(/\/rooms\/186/);

    // Expand flags again and verify persistence
    await page.getByRole("button", { name: "Room Flags" }).click();
    await expect(page.getByLabel("Peaceful")).toBeChecked();
  });
});
