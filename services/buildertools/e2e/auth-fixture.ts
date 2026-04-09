// Playwright fixtures that provide authenticated pages.
// - authenticatedPage: logged in as testbuilder (blocks 100-199)
// - expandedPage: logged in as expandedbuilder (senior builder, blocks 200-299)

import { test as base, expect } from "@playwright/test";

export const test = base.extend<{
  authenticatedPage: import("@playwright/test").Page;
  expandedPage: import("@playwright/test").Page;
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
  expandedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Username").fill("expandedbuilder");
    await page.getByLabel("Password").fill("testpass");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
