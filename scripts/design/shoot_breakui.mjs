// break-ui captures for the chosen direction (Ledger + register): worst-case data at real widths.
// 200% zoom is simulated the way browsers do it: half the CSS width at double the pixel density.
import { Browser } from "/Users/ali/.claude/skills/taste-skill/scripts/lib/cdp.mjs";
import { mkdirSync } from "node:fs";
const BASE = process.argv[2] || "http://localhost:4310/proto/";
const OUT = "replica/design/reviews/break-ui"; mkdirSync(OUT, { recursive: true });
const shots = [
  ["feed-390-light", 390, 844, 2, "data=worst&theme=light"], ["feed-320-light", 320, 700, 2, "data=worst&theme=light"],
  ["feed-zoom200-light", 195, 422, 4, "data=worst&theme=light"], ["feed-1280-dark", 1280, 800, 2, "data=worst&theme=dark"],
  ["sheet-sici-390-light", 390, 844, 2, "data=worst&theme=light&screen=paper&p=2"], ["sheet-sici-320-dark", 320, 700, 2, "data=worst&theme=dark&screen=paper&p=2"],
  ["sheet-nonlatin-390-light", 390, 844, 2, "data=worst&theme=light&screen=paper&p=1"], ["sheet-sici-zoom200-light", 195, 422, 4, "data=worst&theme=light&screen=paper&p=2"],
  ["empty-390-light", 390, 844, 2, "data=empty&theme=light"], ["one-390-dark", 390, 844, 2, "data=one&theme=dark"],
];
const browser = await Browser.launch({ width: 1280, height: 800 });
try {
  for (const [name, w, h, dsf, qs] of shots) {
    const page = await browser.newPage({ width: w, height: h, dsf, mobile: w < 768 });
    await page.goto(`${BASE}?v=3&shot=1&${qs}`, { settleMs: 1800 });
    const over = await page.eval(() => [...document.querySelectorAll(".app *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== "fixed" && !e.closest(".chips")).slice(0, 5).map(e => e.className || e.tagName));
    await page.screenshot({ path: `${OUT}/${name}.png`, format: "png" });
    console.log(name, "overflowing:", JSON.stringify(over));
    await page.close();
  }
} finally { await browser.close(); }
