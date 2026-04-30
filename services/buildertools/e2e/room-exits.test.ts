// e2e/room-exits.test.ts
import { expect, test } from "./auth-fixture.ts";

test.describe("room exits", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    for (const vnum of [180, 181]) {
      try {
        await page.request.delete(`/api/rooms/${vnum}`, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
      } catch {
        // Entity may not exist, cleanup is best-effort
      }
    }
  });

  test("create exit with destination, save, and verify persistence", async ({
    authenticatedPage: page,
  }) => {
    // Create two rooms: source (180) and destination (181)
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);

    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("spinbutton").fill("180");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/rooms\/180/);

    // Fill required fields (Name + Description) so save passes client-side
    // validation. #name avoids the rooms list locator collision during route
    // transition (search input + row aria-labels match "Name").
    await page.locator("#name").fill("test source room");
    await page.locator("#description").fill("placeholder description");
    await page.getByRole("button", { exact: true, name: "Save" }).click();
    await expect(
      page.getByRole("button", { exact: true, name: "Save" }),
    ).toBeDisabled();

    // Create the destination room. From inside the editor, use exact + first
    // for the Rooms link - the breadcrumb has another "Rooms" link and the
    // BackLink's "Back to rooms" title substring-matches.
    await page
      .getByRole("link", { exact: true, name: "Rooms" })
      .first()
      .click();
    await page.waitForURL(/\/rooms$/);

    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("spinbutton").fill("181");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/rooms\/181/);

    await page.locator("#name").fill("test destination room");
    await page.locator("#description").fill("placeholder description");
    await page.getByRole("button", { exact: true, name: "Save" }).click();
    await expect(
      page.getByRole("button", { exact: true, name: "Save" }),
    ).toBeDisabled();

    // Navigate back to source room 180
    await page
      .getByRole("link", { exact: true, name: "Rooms" })
      .first()
      .click();
    await page.waitForURL(/\/rooms$/);
    await page.getByRole("link", { name: /180/ }).click();
    await page.waitForURL(/\/rooms\/180/);

    // Add an exit - the "Add exit" button is in the Exits section header
    await page.getByRole("button", { name: "Add exit" }).click();

    // The new exit defaults to the first available direction (North).
    // Fill the destination field with vnum 181.
    // The Destination field is an EntityPicker (input with placeholder).
    const destinationInput = page.getByLabel("Destination");
    await destinationInput.fill("181");
    // Commit the value by pressing Enter (EntityPicker commit pattern)
    await destinationInput.press("Enter");

    // Save
    await page.getByRole("button", { exact: true, name: "Save" }).click();
    await expect(
      page.getByRole("button", { exact: true, name: "Save" }),
    ).toBeDisabled();

    // Navigate away and back to verify persistence
    await page
      .getByRole("link", { exact: true, name: "Rooms" })
      .first()
      .click();
    await page.waitForURL(/\/rooms$/);
    await page.getByRole("link", { name: /180/ }).click();
    await page.waitForURL(/\/rooms\/180/);

    // Verify the exit persisted - destination should show 181
    await expect(page.getByLabel("Destination")).toHaveValue("181");
  });
});
