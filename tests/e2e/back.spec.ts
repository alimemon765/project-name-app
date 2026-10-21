import { test, expect } from "@playwright/test";

// B3: the Back button (browser, Android gesture/hardware) closes the paper sheet via history state.
test.describe("Back button and the paper sheet", () => {
  test("Back closes an open sheet and stays on the feed", async ({ page }) => {
    await page.goto("/");
    await page.locator("article h2 a").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/[?&]paper=/);
    await page.goBack();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("article:visible").first()).toBeVisible();
  });

  test("closing with the X leaves no extra history entry", async ({ page }) => {
    await page.goto("/saved");
    await page.goto("/");
    await page.locator("article h2 a").first().click();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).not.toHaveURL(/paper=/);
    await page.goBack();                                   // goes to the previous page, not back into the sheet
    await expect(page).toHaveURL(/\/saved$/);
  });

  test("Back with no sheet open navigates normally", async ({ page }) => {
    await page.goto("/settings");
    await page.goto("/");
    await page.goBack();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("a shared ?paper= link opens that paper's sheet", async ({ page }) => {
    await page.goto("/");
    await page.locator("article h2 a").first().click();
    const url = page.url();
    const title = await page.getByRole("dialog").getByRole("heading", { level: 2 }).innerText();
    await page.goto(url);
    await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toHaveText(title);
  });
});
