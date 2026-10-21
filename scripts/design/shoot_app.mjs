// Screenshots of the running app (step 0/1) at exact widths, light + dark, plus PWA/offline checks.
// Usage: node scripts/design/shoot_app.mjs [baseUrl]   (production server: launch config "coastal-app")
import { Browser } from "/Users/ali/.claude/skills/taste-skill/scripts/lib/cdp.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3100";
const OUT = "replica/clone-screens";
mkdirSync(OUT, { recursive: true });
const VPS = [{ name: "phone", width: 390, height: 844, mobile: true }, { name: "desktop", width: 1280, height: 800, mobile: false }];
const report = {};

const browser = await Browser.launch({ width: 1280, height: 800 });
try {
  for (const vp of VPS) for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ width: vp.width, height: vp.height, dsf: 2, mobile: vp.mobile });
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
    await page.goto(`${BASE}/`, { settleMs: 2500 });
    await page.screenshot({ path: `${OUT}/S02-explore-${vp.name}-${theme}.png`, format: "png" });
    // open the first paper (the card link opens the sheet) and let the spring settle
    await page.eval(() => document.querySelector("article h2 a")?.click());
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: `${OUT}/S03-paper-sheet-${vp.name}-${theme}.png`, format: "png" });
    if (vp.name === "phone" && theme === "light") {
      report.sheetOpen = await page.eval(() => Boolean(document.querySelector('[role="dialog"]')));
      await page.eval(() => document.querySelector('[role="dialog"] button[aria-label="Save paper"]')?.click());
      await page.eval(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
      await new Promise((r) => setTimeout(r, 800));
      report.sheetClosedByEsc = await page.eval(() => !document.querySelector('[role="dialog"]'));
      await page.goto(`${BASE}/saved`, { settleMs: 1500 });
      report.savedCount = await page.eval(() => document.querySelectorAll("article").length);
      await page.screenshot({ path: `${OUT}/S08-saved-phone-light.png`, format: "png" });
      // PWA: service worker + offline
      report.swActive = await page.eval(async () => { const r = await navigator.serviceWorker.ready; return Boolean(r.active); });
      await page.goto(`${BASE}/saved`, { settleMs: 1200 });   // page now controlled by the SW
      await page.send("Network.enable");
      await page.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await page.goto(`${BASE}/saved`, { settleMs: 1500 });
      report.offlineSavedCards = await page.eval(() => document.querySelectorAll("article").length);
      await page.goto(`${BASE}/news`, { settleMs: 1500 });
      report.offlineUncachedShows = await page.eval(() => document.querySelector("h1")?.textContent);
      await page.screenshot({ path: `${OUT}/offline-phone-light.png`, format: "png" });
      await page.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }
    if (vp.name === "phone" && theme === "dark") {
      await page.goto(`${BASE}/settings`, { settleMs: 1200 });
      await page.screenshot({ path: `${OUT}/S09-settings-phone-dark.png`, format: "png" });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(report));
