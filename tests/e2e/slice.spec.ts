import { test, expect } from "@playwright/test";

test.describe("vertical slice: feed → paper → save", () => {
  test("opens a real paper, saves it, finds it in Saved", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator("article").first();
    await expect(firstCard).toBeVisible();
    const title = (await firstCard.locator("h2").innerText()).trim();
    await firstCard.locator("h2 a").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(title);
    await expect(dialog.getByRole("link", { name: /open (free )?article/i })).toBeVisible();
    await dialog.getByRole("button", { name: "Save paper" }).click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.getByRole("link", { name: "Saved" }).click();
    // Cache Components keeps the previous route mounted but hidden (<Activity>), so assert on visible cards only.
    await expect(page.locator("article h2:visible")).toHaveText([title]);
  });

  test("keyboard only: open the sheet from a card and return focus on close", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("article h2 a").first();
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(link).toBeFocused();
  });

  test("theme can be switched to dark from Settings", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("offline: saved papers stay readable and uncached pages fall back", async ({ page, context }) => {
    await page.goto("/");
    await page.locator("article h2 a").first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Save paper" }).click();
    await page.keyboard.press("Escape");
    // Saves persist to IndexedDB asynchronously; wait until the write lands before a full reload.
    await page.waitForFunction(() => new Promise<boolean>((resolve) => {
      const req = indexedDB.open("keyval-store");
      req.onsuccess = () => {
        const tx = req.result.transaction("keyval", "readonly").objectStore("keyval").get("ph-saves-v1");
        tx.onsuccess = () => resolve(typeof tx.result === "string" && tx.result.includes('"savedAt"'));
        tx.onerror = () => resolve(false);
      };
      req.onerror = () => resolve(false);
    }), undefined, { timeout: 5000 });
    await page.goto("/saved");
    await expect(page.locator("article:visible")).toHaveCount(1);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();                                   // now controlled by the service worker
    await context.setOffline(true);                        // Playwright's offline also covers service-worker fetches
    await page.reload();
    await expect(page.locator("article:visible")).toHaveCount(1);
    await page.goto("/news").catch(() => {});
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/offline/i);
    await context.setOffline(false);
  });
});
