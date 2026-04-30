import { expect, test } from "@playwright/test";

test.describe("login and logout", () => {
  test("successful login redirects to rooms", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("testbuilder");
    await page.getByLabel("Password").fill("testpass");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    // exact: true disambiguates from the username "testbuilder" rendered in
    // a sibling span - Playwright's default substring + case-insensitive
    // match would resolve both spans.
    await expect(page.getByText("TestBuilder", { exact: true })).toBeVisible();
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("testbuilder");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("accessing protected page while logged out redirects to login", async ({
    page,
  }) => {
    await page.goto("/rooms");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("testbuilder");
    await page.getByLabel("Password").fill("testpass");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/rooms");
    await expect(page).toHaveURL(/\/login/);
  });
});
