import { test, expect } from "@playwright/test";

test("closing the sheet with the mouse returns focus to the card that opened it", async ({ page }) => {
  await page.goto("/");
  const link = page.locator("article h2 a").first();
  await link.click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(link).toBeFocused();
});

test("the abstract comes before the authors in the sheet (two taps to an abstract)", async ({ page }) => {
  await page.goto("/");
  await page.locator("article h2 a").first().click();
  const order = await page.getByRole("dialog").evaluate((d) => {
    const all = [...d.querySelectorAll("h3, p")].map((n) => n.textContent ?? "");
    return { abstract: all.findIndex((t) => t === "Abstract"), doi: all.findIndex((t) => /^10\.\d{4,9}\//.test(t.trim())) };
  });
  expect(order.abstract).toBeGreaterThan(-1);
  if (order.doi > -1) expect(order.abstract).toBeLessThan(order.doi);
});
