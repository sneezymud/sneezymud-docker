// e2e/mob-responses.test.ts
import { expect, test } from "./auth-fixture.ts";

test.describe("mob responses", () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    try {
      await page.request.delete("/api/mobs/185", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    } catch {
      // Entity may not exist, cleanup is best-effort
    }
  });

  test("write mob response DSL, save, and verify persistence", async ({
    authenticatedPage: page,
  }) => {
    // Create a mob at vnum 185
    await page.getByRole("link", { name: "Mobs" }).click();
    await page.waitForURL(/\/mobs/);

    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("spinbutton").fill("185");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/mobs\/185/);

    // Give the mob a name so it's identifiable
    await page.getByLabel("Short Description").fill("a test merchant");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

    // Click the mob responses link (shows "Add Mob Response" when no responses exist)
    await page.getByRole("link", { name: "Add Mob Response" }).click();
    await page.waitForURL(/\/mobs\/185\/responses/);

    // The CodeEditor is a CodeMirror instance wrapped in a div with
    // aria-label="Response script editor". Type DSL into it.
    const dsl = 'say {"hello";\n  smile %n;\n  }';
    const editor = page.getByLabel("Response script editor");
    // CodeMirror creates a contenteditable div inside the container.
    // Click to focus, then type the DSL content.
    await editor.click();
    await page.keyboard.type(dsl);

    // Save
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

    // Navigate back to the mob editor
    await page.getByRole("link", { name: "Back to mob" }).click();
    await page.waitForURL(/\/mobs\/185$/);

    // The link should now say "Edit Mob Responses" since content exists
    await expect(
      page.getByRole("link", { name: "Edit Mob Responses" }),
    ).toBeVisible();

    // Navigate to responses again and verify the DSL persisted
    await page.getByRole("link", { name: "Edit Mob Responses" }).click();
    await page.waitForURL(/\/mobs\/185\/responses/);

    // Verify the editor contains the saved DSL text
    const editorContent = page.getByLabel("Response script editor");
    await expect(editorContent).toContainText("hello");
    await expect(editorContent).toContainText("smile %n");
  });
});
