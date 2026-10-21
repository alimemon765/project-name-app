// Capture every direction × screen × viewport × theme (36 PNGs) at exact CSS widths.
// Reuses taste-skill's CDP helper so 390px really is 390px (headless --window-size has a floor).
// Usage: node scripts/design/shoot_directions.mjs [baseUrl]   (server: launch config "coastal-design")
import { Browser } from "/Users/ali/.claude/skills/taste-skill/scripts/lib/cdp.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:4310/proto/";
const DIRS = ["folio", "gauge", "ledger"];
const SCREENS = ["feed", "paper", "region"];
const VIEWPORTS = [{ name: "phone", width: 390, height: 844, mobile: true }, { name: "desktop", width: 1280, height: 800, mobile: false }];
const THEMES = ["light", "dark"];

const browser = await Browser.launch({ width: 1280, height: 800 });
try {
  for (const [i, dir] of DIRS.entries()) {
    mkdirSync(`replica/design/directions/${dir}`, { recursive: true });
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ width: vp.width, height: vp.height, dsf: 2, mobile: vp.mobile });
      for (const screen of SCREENS) for (const theme of THEMES) {
        await page.goto(`${BASE}?v=${i + 1}&theme=${theme}&shot=1&screen=${screen}`, { settleMs: 1800 });
        const path = `replica/design/directions/${dir}/${screen}-${vp.name}-${theme}.png`;
        await page.screenshot({ path, format: "png" });
        console.log("saved", path);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
