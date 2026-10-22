import { test, expect } from "@playwright/test";
import { existsSync, rmSync } from "node:fs";
import { Pool } from "pg";

// Runs against the local admin server (npm run admin → http://localhost:3200), which writes to the dev database.
// It must never touch Ali's real answers: it refuses to run if any exist, and removes only what it wrote.
const ADMIN = process.env.E2E_ADMIN_URL ?? "http://localhost:3200";
const DB = "postgres://postgres@localhost:55433/coastal";
const CSV = "replica/eval/ali-reviews.csv";

test.describe("Classifier review page (local admin)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");
  let pool: Pool;
  test.beforeAll(async ({}, info) => {
    test.skip(info.project.name !== "desktop", "one run is enough");
    const up = await fetch(`${ADMIN}/admin/labels`).then((r) => r.ok, () => false);
    test.skip(!up, "admin server not running (npm run admin)");
    pool = new Pool({ connectionString: DB, max: 1 });
    const n = (await pool.query("select count(*)::int as n from classifier_labels where labeller = 'ali'")).rows[0].n;
    test.skip(n > 0, "Ali has started reviewing: never touch real answers");
  });
  test.afterAll(async () => {
    if (!pool) return;
    await pool.query("delete from classifier_labels where labeller = 'ali'");
    await pool.end();
    if (existsSync(CSV)) rmSync(CSV);
  });

  test("keyboard review: 1 / 2 + Enter / 3 / S autosave and move on; export writes the CSV", async ({ page }) => {
    await page.goto(`${ADMIN}/admin/labels`);
    await expect(page.getByText("Paper 1 of 50")).toBeVisible();
    await expect(page.getByLabel("My labels")).toContainText(/our field/);
    await page.keyboard.press("1");
    await expect(page.getByText("Paper 2 of 50")).toBeVisible();
    await page.keyboard.press("2");
    await page.getByRole("checkbox", { name: "Hydrology" }).check();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Paper 3 of 50")).toBeVisible();
    await page.getByLabel(/Note/).fill("needs a second look");
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("3");
    await expect(page.getByText("Paper 4 of 50")).toBeVisible();
    await page.keyboard.press("s");
    await expect(page.getByText("3 answered · 1 skipped")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Saved: Skipped")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Paper 5 of 50")).toBeVisible();                 // resumes at the first unanswered
    await page.getByRole("button", { name: "Export CSV" }).click();
    await expect(page.getByRole("status")).toContainText("Wrote 4 reviews");
    expect(existsSync(CSV)).toBe(true);
    const rows = (await pool.query("select verdict, note from classifier_labels where labeller = 'ali' order by verdict")).rows;
    expect(rows.map((r) => r.verdict)).toEqual(["correct", "off_topic", "skip", "wrong_topic"]);
    expect(rows.find((r) => r.verdict === "off_topic")?.note).toBe("needs a second look");
  });
});
