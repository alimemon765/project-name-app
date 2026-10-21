# /impeccable typeset + colorize on tokens.json (2026-10-21)

Mode: Operate (feed, sheets, settings). Source: tokens.json (D024 Ledger + register), prototype ledger.css.

## Typeset
- **Mechanical scan:** `impeccable detect --scope type` on ledger.css + base.css found 0 issues.
- **Roles:** card-title 18/24 Newsreader 500, sheet-title 24/30 500 (-0.01em), h1 22/28 Geist 700, body 14/20, small 13/18 muted, meta 12/16 500, abstract 16/26, input 16 (no iOS zoom).
  - Adjacent 12/13/14 sizes carry different jobs by weight and tone, not by size alone (written into the tokens).
- **Body floor:** UI body is 14px. That's a dense Operate role (like the studied dense research screens), and every reading surface (abstract, inputs) is 16px.
- **Changes applied:**
  - balanced wrap on titles, pretty wrap + a 68ch measure on abstracts;
  - only the used weights load (Newsreader 400/500 with opsz, Geist 400/500/700, Geist Mono 400) via next/font with metric fallbacks;
  - light-on-dark tracking +0.005em.
- **Stress:** the 40-word title and 33-author list (wc fixtures) wrap without overflow at 390px; DOIs break anywhere (`overflow-wrap:anywhere`).

## Colorize
- **Strategy:** restrained, ink chrome. One data hue (#1d5fbf / #7aa7f0) owns a single meaning: new since your last visit.
  - Topic hues are a data code (register glyphs, chips), always paired with a shape + name.
  - Semantic hues appear only on status (retracted, success/warning/danger).
- **Added roles:** `info` (= the data hue, for neutral notices) and `selected` (nav and list selection, a tone step, never the hue).
- **Dark mode:** designed elevation (bg #0b0c0e < surface #15171a < raised #1e2125), not an inversion.
- **Contrast:** `scripts/design/check_contrast.sh`, 78 pairs per theme, 0 AA failures in light and in dark.
