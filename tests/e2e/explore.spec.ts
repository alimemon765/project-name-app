import { test, expect, type Page } from "@playwright/test";

// Explore against the local dev database. Assertions compare the UI with the API for the same query, so they hold
// whatever the data is; they only assume a few hundred papers in the last 30 days.
const cards = (page: Page) => page.locator("article:visible");
const status = (page: Page) => page.locator("[aria-live=polite]:visible").first();
const totalOf = async (page: Page) => Number(((await status(page).textContent()) ?? "").replace(/,/g, "").match(/(\d+) (?:papers?|results?)/)?.[1] ?? NaN);
const api = async (page: Page, path: string) => page.evaluate(async (p) => (await fetch(p)).json(), path);
const chip = (page: Page, name: RegExp) => page.getByRole("button", { name }).filter({ visible: true }).first();
const settle = (page: Page) => expect(page.locator("[aria-busy=true]:visible")).toHaveCount(0);

test.describe("Explore", () => {
  test("search highlights matches, writes the URL, and survives a reload", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("searchbox", { name: "Search papers" }).filter({ visible: true });
    await box.fill("storm surge");
    await box.press("Enter");
    await expect(page).toHaveURL(/\?q=storm\+surge$/);
    await expect(status(page)).toContainText("results for “storm surge”");
    await expect(page.locator("article:visible mark").first()).toBeVisible();
    const n = await totalOf(page);
    const fromApi = await api(page, "/api/feed?q=storm+surge&t=all&pre=1&sort=relevance&days=30");
    expect(n).toBe(fromApi.total);
    await page.reload();
    await expect(box).toHaveValue("storm surge");
    await expect(status(page)).toContainText(`${n.toLocaleString("en")} result`);
  });

  test("pasting a DOI opens that paper", async ({ page }) => {
    await page.goto("/");
    const doi = await cards(page).first().locator("h2 a").getAttribute("href");
    const raw = decodeURIComponent((doi ?? "").replace(/^\/paper\//, ""));
    test.skip(!raw.startsWith("10."), "first card has no DOI");
    const box = page.getByRole("searchbox", { name: "Search papers" }).filter({ visible: true });
    await box.focus();
    await page.evaluate((text) => {
      const dt = new DataTransfer(); dt.setData("text", text);
      document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    }, `https://doi.org/${raw.toUpperCase()}`);
    await expect(page).toHaveURL(new RegExp(`/paper/${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
  });

  test("a topic picked in the sheet is applied on Done, and Back undoes it", async ({ page }, info) => {
    test.skip(info.project.name === "desktop", "desktop filters topics with the rail (D039)");
    await page.goto("/");
    const before = await totalOf(page);
    await chip(page, /^Topics/).click();
    const sheet = page.getByRole("dialog", { name: "Topics" });
    await sheet.getByLabel("Subsidence").check();
    await expect(page).toHaveURL(/\/$/);                                   // staged, not applied yet
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL(/\?t=subsidence$/);
    await expect(chip(page, /^Subsidence/)).toBeVisible();
    await settle(page);
    const narrowed = await totalOf(page);
    expect(narrowed).toBeLessThan(before);
    expect(narrowed).toBe((await api(page, "/api/feed?t=subsidence&pre=1&sort=new&days=30")).total);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(chip(page, /^Topics$/)).toBeVisible();
  });

  test("the Back button closes a filter sheet and keeps what was picked", async ({ page }) => {
    await page.goto("/");
    await chip(page, /^Regions/).click();
    await page.getByRole("dialog", { name: "Regions" }).getByRole("checkbox", { name: /^India( |$)/ }).check();
    await page.goBack();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\?r=india$/);
  });

  test("the journal sheet can be searched and shows live counts", async ({ page }) => {
    await page.goto("/");
    await chip(page, /^Journals/).click();
    const sheet = page.getByRole("dialog", { name: "Journals" });
    await sheet.getByRole("searchbox", { name: /find a journal/i }).fill("hazards");
    const row = sheet.locator("label").filter({ hasText: "Natural Hazards and Earth System Sciences" });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/\d/);
    await row.locator("input").check();
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL(/j=nhess/);
  });

  test("open access and hide-preprints are one-tap toggles that narrow the feed", async ({ page }) => {
    await page.goto("/");
    await chip(page, /^Open access$/).click();
    await expect(page).toHaveURL(/oa=1/);
    await chip(page, /Hide preprints/).click();
    await expect(page).toHaveURL(/pre=0/);
    await settle(page);
    await expect(cards(page).first()).toBeVisible();
    await expect(page.locator("article:visible").filter({ hasText: "Preprint" })).toHaveCount(0);
    expect(await totalOf(page)).toBe((await api(page, "/api/feed?t=all&oa=1&pre=0&sort=new&days=30")).total);
  });

  for (const [sort, label] of [["old", "Oldest"], ["cited", "Most cited"], ["trending", "Trending"]] as const) {
    test(`sort: ${label} orders like the API and is kept in the URL`, async ({ page }) => {
      await page.goto("/");
      await chip(page, /^Newest/).click();
      await page.getByRole("dialog", { name: "Sort by" }).getByLabel(label, { exact: true }).check();
      await page.getByRole("dialog", { name: "Sort by" }).getByRole("button", { name: "Done" }).click();
      await expect(page).toHaveURL(new RegExp(`sort=${sort}`));
      await settle(page);
      const shown = await page.locator("article:visible h2 a").evaluateAll((as) => as.slice(0, 5).map((a) => a.getAttribute("data-paper-link")));
      const fromApi = (await api(page, `/api/feed?t=all&pre=1&sort=${sort}&days=30`)).papers.slice(0, 5).map((p: { id: string }) => p.id);
      expect(shown).toEqual(fromApi);
    });
  }

  test("filters, sort and search combine and round-trip through the URL", async ({ page }) => {
    const url = "/?q=flood&t=flood-risk,hydrology&oa=1&sort=cited&days=14";
    await page.goto(url);
    await expect(page.getByRole("searchbox", { name: "Search papers" }).filter({ visible: true })).toHaveValue("flood");
    await expect(page.getByRole("button", { name: "Remove Flood risk" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove Hydrology" })).toBeVisible();
    await expect(chip(page, /^Open access$/)).toHaveAttribute("aria-pressed", "true");
    await expect(chip(page, /^Most cited/)).toBeVisible();
    const fromApi = await api(page, "/api/feed?q=flood&t=flood-risk,hydrology&oa=1&pre=1&sort=cited&days=14");
    await settle(page);
    expect(await totalOf(page)).toBe(fromApi.total);
  });

  test("infinite scroll loads every page once and then ends honestly", async ({ page }) => {
    test.setTimeout(120_000);                                              // walks every card of the filter
    await page.goto("/?t=subsidence");
    await settle(page);
    const total = await totalOf(page);
    test.skip(total > 400 || total < 31, `needs 31–400 papers for this filter, got ${total}`);
    const seen = new Set<string>();
    // Scroll the window itself (a wheel over the desktop rail would scroll the rail), in steps shorter than the
    // rendered overscan so every card is in the DOM at some step.
    const atEnd = async () => page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
      && document.body.innerText.includes("That's every paper from the last 30 days."));
    for (let i = 0; i < 400 && !(await atEnd()); i++) {
      for (const id of await page.locator("article:visible h2 a").evaluateAll((as) => as.map((a) => a.getAttribute("data-paper-link") ?? ""))) seen.add(id);
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(80);
    }
    for (const id of await page.locator("article:visible h2 a").evaluateAll((as) => as.map((a) => a.getAttribute("data-paper-link") ?? ""))) seen.add(id);
    await expect(page.getByText("That's every paper from the last 30 days.")).toBeVisible();
    expect(seen.size).toBe(total);
  });

  test("new-since counts respect the active filters, and the chip filters to new papers", async ({ page }) => {
    await page.goto("/settings");                                          // not Explore: leaving Explore stamps a fresh visit
    const lastVisit = new Date(Date.now() - 2 * 86_400_000).toISOString();
    await page.evaluate(async (at) => {                                   // a previous visit two days ago (zustand persist in IndexedDB)
      const db = await new Promise<IDBDatabase>((res, rej) => {                   // same shape as idb-keyval's default store
        const r = indexedDB.open("keyval-store");
        r.onupgradeneeded = () => r.result.createObjectStore("keyval");
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      await new Promise<void>((res, rej) => { const tx = db.transaction("keyval", "readwrite");
        tx.objectStore("keyval").put(JSON.stringify({ state: { saved: {}, lastVisit: at }, version: 1 }), "ph-saves-v1");
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    }, lastVisit);
    await page.goto("/?t=hydrology");
    const expected = (await api(page, `/api/new-count?t=hydrology&pre=1&sort=new&days=30&since=${encodeURIComponent(lastVisit)}`)).count as number;
    const newChip = page.getByRole("button", { name: /new since/i }).filter({ visible: true });
    await expect(newChip).toBeVisible();
    if (expected > 0) await expect(newChip).toContainText(expected.toLocaleString("en"));
    else await expect(newChip).toContainText("Nothing new");
    await newChip.click();
    await expect(newChip).toHaveAttribute("aria-pressed", "true");
    await settle(page);
    await expect(status(page)).toContainText("new only");
    expect(await totalOf(page)).toBe(expected);
  });

  test("an impossible combination shows an empty state that names the filters and can clear them", async ({ page }) => {
    await page.goto("/?q=zzqxvbnw&t=subsidence");
    await expect(page.getByText("No results for “zzqxvbnw”")).toBeVisible();
    await expect(page.getByText(/limited to Subsidence/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search and filters" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(cards(page).first()).toBeVisible();
  });
});

test.describe("Explore on desktop", () => {
  test("the topic rail filters with one click and shows counts", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop only");
    await page.goto("/");
    const rail = page.getByRole("navigation", { name: "Filter by topic" });
    await expect(rail.getByRole("button", { name: /Hydrology/ })).toContainText(/\d/);
    await rail.getByRole("button", { name: /Hydrology/ }).click();
    await expect(page).toHaveURL(/\?t=hydrology$/);
    await expect(rail.getByRole("button", { name: /Hydrology/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("filter sheets open as a side panel", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop only");
    await page.goto("/");
    await chip(page, /^Regions/).click();
    const box = await page.getByRole("dialog", { name: "Regions" }).boundingBox();
    expect(box?.x).toBeGreaterThan(600);
    expect(box?.height).toBeGreaterThan(700);
  });
});

test.describe("Onboarding", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("first visit asks for topics, and Explore opens on them", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "What do you work on?" });
    await expect(dialog).toBeVisible();
    await dialog.getByText("Subsidence").click();
    await dialog.getByText("Hydrology").click();
    await dialog.getByRole("button", { name: "Show these 2 topics" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Remove Subsidence" })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);                                     // the reader's default needs no URL params
    await page.reload();
    await expect(page.getByRole("dialog", { name: "What do you work on?" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Remove Hydrology" })).toBeVisible();
  });

  test("skipping shows every topic and does not ask again", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip, show every topic" }).click();
    await expect(page.getByText("Showing:")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("dialog", { name: "What do you work on?" })).toBeHidden();
  });
});

test.describe("Settings shape Explore's defaults", () => {
  test("time window, preprints and topics chosen in Settings become Explore's clean default", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("radio", { name: "14 days" }).click();
    await page.getByRole("switch", { name: "Show preprints" }).click();
    await page.getByText("Hydrology").click();
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(status(page)).toContainText("in the last 14 days");
    await expect(page.getByRole("button", { name: "Remove Hydrology" })).toBeVisible();
    await expect(chip(page, /Hide preprints/)).toHaveAttribute("aria-pressed", "true");
    const fromApi = await api(page, "/api/feed?t=hydrology&pre=0&sort=new&days=14");
    expect(await totalOf(page)).toBe(fromApi.total);
    await page.getByRole("button", { name: "Remove Hydrology" }).click();   // clearing my topics for this view is explicit
    await expect(page).toHaveURL(/\?t=all$/);
  });
});

test.describe("Design pass fixes (2026-10-22)", () => {
  test("the chip row starts at its first chip once the new-since chip appears", async ({ page }) => {
    await page.goto("/settings");
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("keyval-store"); r.onupgradeneeded = () => r.result.createObjectStore("keyval"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      await new Promise<void>((res) => { const tx = db.transaction("keyval", "readwrite"); tx.objectStore("keyval").put(JSON.stringify({ state: { saved: {}, lastVisit: new Date(Date.now() - 86_400_000).toISOString() }, version: 1 }), "ph-saves-v1"); tx.oncomplete = () => res(); });
    });
    await page.goto("/");
    const newChip = page.getByRole("button", { name: /new since/i }).filter({ visible: true });
    await expect(newChip).toBeVisible();
    await expect.poll(() => newChip.evaluate((el) => el.parentElement!.scrollLeft)).toBe(0);
    await expect(newChip).toBeInViewport();
  });

  test("the Journals sheet never scrolls sideways, even with the longest journal names", async ({ page }) => {
    await page.goto("/");
    await chip(page, /^Journals/).click();
    const sheet = page.getByRole("dialog", { name: "Journals" });
    await expect(sheet.getByText("Journal of Waterway, Port, Coastal, and Ocean Engineering")).toBeVisible();
    const overflow = await sheet.evaluate((d) => [...d.querySelectorAll<HTMLElement>("*")].some((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible"));
    expect(overflow).toBe(false);
  });

  test("focus lands on the sheet's title when it opens, not on Done", async ({ page }) => {
    await page.goto("/");
    await chip(page, /^Regions/).click();
    await expect(page.getByRole("dialog", { name: "Regions" }).getByRole("heading", { name: "Regions" })).toBeFocused();
  });

  test("slash focuses search; the skip link jumps to the content", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "keyboard shortcuts are a desktop affordance");
    await page.goto("/");
    await page.waitForLoadState("networkidle");                            // the shortcut listener attaches on hydration
    await page.locator("body").press("/");
    await expect(page.getByRole("searchbox", { name: "Search papers" })).toBeFocused();
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("an empty search inside filters offers to search everything with the same words", async ({ page }) => {
    await page.goto("/?q=Ratnagiri&t=extreme-values&oa=1");
    await page.getByRole("button", { name: "Search all papers for “Ratnagiri”" }).click();
    await expect(page).toHaveURL(/\?q=Ratnagiri(&t=all)?$/);
  });
});

test.describe("Onboarding never covers a shared link", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("a first-time visitor opening a search link sees the results, not the topic question", async ({ page }) => {
    await page.goto("/?q=storm+surge");
    await expect(page.locator("article:visible").first()).toBeVisible();
    await expect(page.getByRole("dialog", { name: "What do you work on?" })).toBeHidden();
  });
  test("on the plain address, onboarding opens with focus on its heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What do you work on?" })).toBeFocused();
  });
});

test.describe("Time-window chip (D038)", () => {
  test("chip, URL and status line stay in sync; the chip overrides without touching the default", async ({ page }) => {
    await page.goto("/");
    const windowChip = page.locator("button[data-sheet=window]:visible");
    await expect(windowChip).toHaveText(/Last 30 days/);
    await expect(status(page)).toContainText("in the last 30 days");
    await windowChip.click();
    const sheet = page.getByRole("dialog", { name: "Time window" });
    await expect(sheet.getByRole("radio", { name: /Last 180 days/ })).toBeDisabled();
    await sheet.getByRole("radio", { name: /^Last 7 days/ }).check();
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL(/[?&]days=7(&|$)/);
    await expect(windowChip).toHaveText(/Last 7 days/);
    await expect(status(page)).toContainText("in the last 7 days");
    expect(await totalOf(page)).toBe((await api(page, "/api/feed?t=all&pre=1&sort=new&days=7")).total);
    await page.goto("/settings");
    await expect(page.getByRole("radio", { name: "30 days" })).toHaveAttribute("aria-checked", "true");   // default untouched
    await page.goto("/");
    await expect(windowChip).toHaveText(/Last 30 days/);                                                     // a fresh Explore uses it
  });

  test("the default comes from Settings, and the URL stays clean on it", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("radio", { name: "14 days" }).click();
    await page.goto("/");
    await expect(page.locator("button[data-sheet=window]:visible")).toHaveText(/Last 14 days/);
    await expect(status(page)).toContainText("in the last 14 days");
    await expect(page).toHaveURL(/\/$/);
  });

  test("an empty view offers to widen to the next window", async ({ page }) => {
    await page.goto("/?t=coastal-geotechnics&r=mumbai&oa=1&days=7");
    const widen = page.getByRole("button", { name: "Widen to 14 days" });
    test.skip(!(await widen.isVisible().catch(() => false)), "this combination has papers in the local data");
    await widen.click();
    await expect(page).toHaveURL(/days=14/);
  });

  test("while searching, the chip says all months", async ({ page }) => {
    await page.goto("/?q=surge");
    await expect(page.getByText("All months").filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator("button[data-sheet=window]:visible")).toHaveCount(0);
  });
});

test.describe("Topic filter across sizes (D039)", () => {
  test("desktop uses the rail only, with a Clear link; the summary line names the topics", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop only");
    await page.goto("/");
    await expect(page.locator("button[data-sheet=topics]:visible")).toHaveCount(0);
    const rail = page.getByRole("navigation", { name: "Filter by topic" });
    await rail.getByRole("button", { name: /^Subsidence/ }).click();
    await rail.getByRole("button", { name: /^Hydrology/ }).click();
    await expect(page.getByText("Showing:")).toBeVisible();
    await page.getByRole("button", { name: "Remove Hydrology" }).click();
    await expect(page).toHaveURL(/\?t=subsidence$/);
    await rail.getByRole("button", { name: "Clear" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Showing:")).toHaveCount(0);
  });

  test("phone keeps the Topics chip and shows the same summary", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "phone only");
    await page.goto("/?t=subsidence");
    await expect(page.locator("button[data-sheet=topics]:visible")).toHaveText(/Subsidence/);
    await expect(page.getByRole("button", { name: "Remove Subsidence" })).toBeVisible();
  });

  test("resizing between phone and desktop never drops a filter", async ({ page }) => {
    await page.goto("/?t=flood-risk,subsidence&oa=1&days=14");
    for (const width of [1280, 390, 1100, 700]) {
      await page.setViewportSize({ width, height: 850 });
      await expect(page).toHaveURL(/t=flood-risk,subsidence/);
      await expect(page.getByRole("button", { name: "Remove Flood risk" })).toBeVisible();
      await expect(page.locator("button[data-sheet=window]:visible")).toHaveText(/Last 14 days/);
    }
  });
});

test.describe("New since your last visit (D040)", () => {
  const seedVisit = async (page: Page) => {
    await page.goto("/settings");
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("keyval-store"); r.onupgradeneeded = () => r.result.createObjectStore("keyval"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      await new Promise<void>((res) => { const tx = db.transaction("keyval", "readwrite"); tx.objectStore("keyval").put(JSON.stringify({ state: { saved: {}, lastVisit: new Date(Date.now() - 2 * 86_400_000).toISOString() }, version: 1 }), "ph-saves-v1"); tx.oncomplete = () => res(); });
    });
  };
  test("by default a return visit shows the normal feed with the chip off", async ({ page }) => {
    await seedVisit(page);
    await page.goto("/");
    const newChip = page.getByRole("button", { name: /new since/i }).filter({ visible: true });
    await expect(newChip).toHaveAttribute("aria-pressed", "false");
    await expect(status(page)).not.toContainText("new only");
  });
  test("the Settings option opens on new papers, and one tap shows everything again", async ({ page }) => {
    await seedVisit(page);
    await page.getByRole("switch", { name: "When I come back, show only new papers" }).click();
    await page.goto("/");
    const newChip = page.getByRole("button", { name: /new since/i }).filter({ visible: true });
    await expect(newChip).toHaveAttribute("aria-pressed", "true");
    await expect(status(page)).toContainText("new only");
    await newChip.click();
    await expect(newChip).toHaveAttribute("aria-pressed", "false");
    await expect(status(page)).not.toContainText("new only");
  });
});
