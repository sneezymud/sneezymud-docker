// e2e/permission-gates.test.ts

import { expect, test } from "./auth-fixture.ts";

test.describe("permission-gated UI", () => {
  test("non-senior builder does not see publish link", async ({
    authenticatedPage: page,
  }) => {
    // authenticatedPage is testbuilder (not senior)
    await expect(page.getByRole("link", { name: "Publish" })).toBeHidden();
  });

  test("senior builder sees publish link", async ({ seniorPage: page }) => {
    await expect(page.getByRole("link", { name: "Publish" })).toBeVisible();
  });

  test("senior builder sees owner toggle on entity list", async ({
    seniorPage: page,
  }) => {
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);
    await expect(page.getByRole("button", { name: "Mine" })).toBeVisible();
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
  });

  test("non-senior builder does not see owner toggle", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms/);
    await expect(page.getByRole("button", { name: "Mine" })).toBeHidden();
    await expect(page.getByRole("button", { name: "All" })).toBeHidden();
  });
});
