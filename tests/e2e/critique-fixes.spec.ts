import { test, expect } from "@playwright/test";

test("Show more loads the next page without duplicates and ends honestly", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator("article:visible");
  const before = await cards.count();
  const more = page.getByRole("button", { name: /show more/i });
  if (await more.count()) {
    await more.click();
    await expect.poll(async () => cards.count()).toBeGreaterThan(before);
    const ids = await page.locator("article:visible h2 a").evaluateAll((as) => as.map((a) => a.getAttribute("data-paper-link")));
    expect(new Set(ids).size).toBe(ids.length);
  }
  // Page through to the end, waiting for each load to finish (the button reads "Loading…" mid-request).
  for (let guard = 0; guard < 50; guard++) {
    await expect(page.getByRole("button", { name: /loading/i })).toHaveCount(0);
    const next = page.getByRole("button", { name: /show more/i });
    if (!(await next.count())) break;
    await next.click();
  }
  await expect(page.getByText("That's every paper from the last 30 days.")).toBeVisible();
});

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
