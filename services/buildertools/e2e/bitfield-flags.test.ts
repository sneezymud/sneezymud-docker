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

    // Reload to invalidate the TanStack Query cache populated at login.
    // page.request.post updates the server but not the client cache, and
    // the auth fixture lands on /rooms so clicking the Rooms sidebar link
    // is a no-op (no refetch).
    await page.reload();

    // Navigate to room
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);
    await page.getByRole("link", { name: "186" }).click();
    await page.waitForURL(/\/rooms\/186/);

    // Fill required fields (Name + Description) so save passes client-side
    // validation; without them, applyValidation() blocks the save and the
    // flag change never persists.
    await page.locator("#name").fill("flag test room");
    await page.locator("#description").fill("placeholder description");

    // Expand the "Room Flags" section (collapsed by default)
    // .first() targets the outer expand button - the inner one is the tooltip
    // trigger rendered by the section header (sections with a tooltip prop).
    await page.getByRole("button", { name: "Room Flags" }).first().click();

    // Toggle the "Peaceful" flag (bit 4 - prevents combat in the room).
    // Use role=checkbox to disambiguate from the "Info about Peaceful"
    // tooltip button rendered next to each flag by the bitfield editor.
    const flagCheckbox = page.getByRole("checkbox", { name: "Peaceful" });
    await flagCheckbox.check();

    // Save. exact: true disambiguates from the "Info about Save Room" info
    // button rendered by the bitfield editor for the Save Room flag.
    await page.getByRole("button", { exact: true, name: "Save" }).click();
    await expect(
      page.getByRole("button", { exact: true, name: "Save" }),
    ).toBeDisabled();

    // Navigate away and back. Use exact + first for the sidebar Rooms link
    // (breadcrumb has another "Rooms" link from inside the editor).
    await page
      .getByRole("link", { exact: true, name: "Rooms" })
      .first()
      .click();
    await page.waitForURL(/\/rooms$/);
    await page.getByRole("link", { name: "186" }).click();
    await page.waitForURL(/\/rooms\/186/);

    // Expand flags again and verify persistence
    // .first() targets the outer expand button - the inner one is the tooltip
    // trigger rendered by the section header (sections with a tooltip prop).
    await page.getByRole("button", { name: "Room Flags" }).first().click();
    await expect(
      page.getByRole("checkbox", { name: "Peaceful" }),
    ).toBeChecked();
  });
});
