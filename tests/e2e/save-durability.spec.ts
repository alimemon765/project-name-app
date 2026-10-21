import { test, expect } from "@playwright/test";

// B4: a save survives a full-page navigation fired immediately after tapping Save (no waiting for IndexedDB).
test("save survives an immediate full navigation", async ({ page }) => {
  await page.goto("/");
  await page.locator("article h2 a").first().click();
  const title = await page.getByRole("dialog").getByRole("heading", { level: 2 }).innerText();
  await page.getByRole("dialog").getByRole("button", { name: "Save paper" }).click();
  await page.goto("/saved");                                 // immediately: no wait for the async IndexedDB write
  await expect(page.locator("article:visible h2")).toHaveText([title]);
});

test("unsave also survives an immediate navigation", async ({ page }) => {
  await page.goto("/");
  await page.locator("article h2 a").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Save paper" }).click();
  await dialog.getByRole("button", { name: "Remove from saved" }).click();
  await page.goto("/saved");
  await expect(page.getByText("Nothing saved yet")).toBeVisible();
});
