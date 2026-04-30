// e2e/bulk-delete.test.ts

import { expect, test } from "./auth-fixture.ts";

const VNUMS = [140, 141, 142];
const API_HEADERS = { "X-Requested-With": "XMLHttpRequest" };

test.describe("bulk delete rooms", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    for (const vnum of VNUMS) {
      try {
        await page.request.delete(`/api/rooms/${vnum}`, {
          headers: API_HEADERS,
        });
      } catch {
        // Entity may already be deleted by the test
      }
    }
  });

  test("bulk delete removes selected rooms from list", async ({
    authenticatedPage: page,
  }) => {
    // Create 3 rooms via API
    for (const vnum of VNUMS) {
      const res = await page.request.post("/api/rooms", {
        data: { vnum },
        headers: API_HEADERS,
      });
      expect(res.status()).toBe(201);
    }

    // Reload to invalidate the TanStack Query cache. Needed for rooms
    // because the auth fixture lands on /rooms - clicking the Rooms
    // sidebar link wouldn't trigger a refetch. Mobs/objects variants
    // don't need this because clicking Mobs/Objects does navigate.
    await page.reload();

    await page.getByRole("link", { name: "Rooms" }).click();
    await page.waitForURL(/\/rooms$/);

    // Verify all 3 appear in the list
    await expect(page.getByRole("link", { name: "140" })).toBeVisible();
    await expect(page.getByRole("link", { name: "141" })).toBeVisible();
    await expect(page.getByRole("link", { name: "142" })).toBeVisible();

    // Select all on this page
    await page
      .getByRole("checkbox", { name: "Select all on this page" })
      .click();

    // Click the bulk delete button
    await page.getByRole("button", { name: /delete \d/i }).click();

    // Confirm in the dialog
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();

    // Verify all 3 vnums are removed
    await expect(page.getByRole("link", { name: "140" })).toBeHidden();
    await expect(page.getByRole("link", { name: "141" })).toBeHidden();
    await expect(page.getByRole("link", { name: "142" })).toBeHidden();
  });
});

test.describe("bulk delete mobs", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    for (const vnum of VNUMS) {
      try {
        await page.request.delete(`/api/mobs/${vnum}`, {
          headers: API_HEADERS,
        });
      } catch {
        // Entity may already be deleted by the test
      }
    }
  });

  test("bulk delete removes selected mobs from list", async ({
    authenticatedPage: page,
  }) => {
    // Create 3 mobs via API
    for (const vnum of VNUMS) {
      const res = await page.request.post("/api/mobs", {
        data: { vnum },
        headers: API_HEADERS,
      });
      expect(res.status()).toBe(201);
    }

    await page.getByRole("link", { name: "Mobs" }).click();
    await page.waitForURL(/\/mobs$/);

    // Verify all 3 appear in the list
    await expect(page.getByRole("link", { name: "140" })).toBeVisible();
    await expect(page.getByRole("link", { name: "141" })).toBeVisible();
    await expect(page.getByRole("link", { name: "142" })).toBeVisible();

    // Select all on this page
    await page
      .getByRole("checkbox", { name: "Select all on this page" })
      .click();

    // Click the bulk delete button
    await page.getByRole("button", { name: /delete \d/i }).click();

    // Confirm in the dialog
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();

    // Verify all 3 vnums are removed
    await expect(page.getByRole("link", { name: "140" })).toBeHidden();
    await expect(page.getByRole("link", { name: "141" })).toBeHidden();
    await expect(page.getByRole("link", { name: "142" })).toBeHidden();
  });
});

test.describe("bulk delete objects", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    for (const vnum of VNUMS) {
      try {
        await page.request.delete(`/api/objects/${vnum}`, {
          headers: API_HEADERS,
        });
      } catch {
        // Entity may already be deleted by the test
      }
    }
  });

  test("bulk delete removes selected objects from list", async ({
    authenticatedPage: page,
  }) => {
    // Create 3 objects via API
    for (const vnum of VNUMS) {
      const res = await page.request.post("/api/objects", {
        data: { vnum },
        headers: API_HEADERS,
      });
      expect(res.status()).toBe(201);
    }

    await page.getByRole("link", { name: "Objects" }).click();
    await page.waitForURL(/\/objects$/);

    // Verify all 3 appear in the list
    await expect(page.getByRole("link", { name: "140" })).toBeVisible();
    await expect(page.getByRole("link", { name: "141" })).toBeVisible();
    await expect(page.getByRole("link", { name: "142" })).toBeVisible();

    // Select all on this page
    await page
      .getByRole("checkbox", { name: "Select all on this page" })
      .click();

    // Click the bulk delete button
    await page.getByRole("button", { name: /delete \d/i }).click();

    // Confirm in the dialog
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();

    // Verify all 3 vnums are removed
    await expect(page.getByRole("link", { name: "140" })).toBeHidden();
    await expect(page.getByRole("link", { name: "141" })).toBeHidden();
    await expect(page.getByRole("link", { name: "142" })).toBeHidden();
  });
});
