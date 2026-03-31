// Playwright fixture that provides an authenticated page (logged in as testbuilder).

import { test as base, expect } from "@playwright/test";

export const test = base.extend<{
  authenticatedPage: import("@playwright/test").Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/login");

    await page.getByLabel("Username").fill("testbuilder");
    await page.getByLabel("Password").fill("testpass");
    await page.getByRole("button", { name: "Log in" }).click();

    // Wait for redirect away from login
    await expect(page).not.toHaveURL(/\/login/);

    await use(page);
  },
});

export { expect } from "@playwright/test";
