---
name: PROJECT_NAME
description: A calm, open research ledger for coastal, flood and hydrology science.
colors:
  bg: "#f2f4f7"
  surface: "#ffffff"
  raised: "#e8ebf0"
  text: "#0a0a0a"
  text-muted: "#5d6067"
  border: "#e2e5ea"
  border-strong: "#c4c8cf"
  border-input: "#83878f"
  accent: "#1d5fbf"
  on-accent: "#ffffff"
  primary: "#0a0a0a"
  on-primary: "#ffffff"
  focus: "#1d5fbf"
  success: "#1f7a4d"
  warning: "#8a5a00"
  danger: "#b42318"
  badge-retracted-bg: "#fdecea"
  badge-retracted-text: "#8a1c12"
  bg-dark: "#0b0c0e"
  surface-dark: "#15171a"
  raised-dark: "#1e2125"
  text-dark: "#f4f5f6"
  text-muted-dark: "#a1a5ab"
  border-dark: "#24272c"
  border-strong-dark: "#40444b"
  border-input-dark: "#6f747d"
  accent-dark: "#7aa7f0"
  on-accent-dark: "#0b0c0e"
  primary-dark: "#f4f5f6"
  on-primary-dark: "#0b0c0e"
  focus-dark: "#7aa7f0"
  success-dark: "#4cc38a"
  warning-dark: "#e0a33a"
  danger-dark: "#f2706a"
  badge-retracted-bg-dark: "#3a1714"
  badge-retracted-text-dark: "#ffb4ab"
  topic-1: "#873431"
  topic-2: "#833b02"
  topic-3: "#764600"
  topic-4: "#625200"
  topic-5: "#445d00"
  topic-6: "#0d632d"
  topic-7: "#00664f"
  topic-8: "#006469"
  topic-9: "#00607c"
  topic-10: "#00598a"
  topic-11: "#1f5390"
  topic-12: "#6f3a78"
  topic-13: "#7d3461"
typography:
  meta:
    fontFamily: "var(--nf-sans), Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  small:
    fontFamily: "var(--nf-sans), Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  body:
    fontFamily: "var(--nf-sans), Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  input:
    fontFamily: "var(--nf-sans), Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  abstract:
    fontFamily: "var(--nf-sans), Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "26px"
  card-title:
    fontFamily: "var(--nf-title), Newsreader, Georgia, Times New Roman, serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: "24px"
  h1:
    fontFamily: "var(--nf-sans), Geist, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  sheet-title:
    fontFamily: "var(--nf-title), Newsreader, Georgia, Times New Roman, serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: "30px"
    letterSpacing: "-0.01em"
rounded:
  chip: "6px"
  control: "8px"
  card: "8px"
  pop: "12px"
  sheet: "16px"
  pill: "999px"
spacing:
  s4: "4px"
  s8: "8px"
  s12: "12px"
  s16: "16px"
  s24: "24px"
  s32: "32px"
  s48: "48px"
  s64: "64px"
components:
  paper-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "14px 8px 14px 14px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    height: "48px"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.chip}"
    height: "36px"
  badge-retracted:
    backgroundColor: "{colors.badge-retracted-bg}"
    textColor: "{colors.badge-retracted-text}"
    rounded: "{rounded.chip}"
    height: "24px"
  search-field:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "34px"
---

# Design System: PROJECT_NAME

> Generated from `replica/design/tokens.json` (the source of truth) by `scripts/design/write_design_md.py`. Re-run `/impeccable document` against shipped code before deploy.

## Overview

**Creative North Star: "The Tide Ledger"** *(proposed; pending Ali's confirmation)*

New research arrives in tides, every few hours, from 130 journals. This interface is the ledger a careful researcher keeps of what came in: ink on fog, entries on plain white cards, and exactly one coloured mark for the only thing that changes between visits, what is new. It is a working tool for daily use, so precision and restraint carry the identity, not decoration.

Density is medium: about two and a half papers per phone screen, every title set in a reading serif so it can be scanned rather than decoded. Topics are a data code, not a palette: thirteen fixed slots, each with its own shape and hue, so a paper's research areas can be read at a glance and never by colour alone. It must never resemble the reference app it rebuilds: no dark-teal default, no mascot, no coloured bar down the side of a card.

**Key Characteristics:**
- Ink chrome on a fog ground; white cards with a 1px hairline, no shadows at rest
- One data hue (Tide Mark Blue) reserved for new-since-last-visit
- Serif titles (Newsreader), sans interface (Geist), mono only for DOIs (Geist Mono)
- The 13-slot topic register: fixed position + shape + hue + name
- Light and dark are equal; dark is designed, not inverted

## Colors

Ink and fog, one tide-blue mark, and a thirteen-hue data code for topics; every pair passes WCAG AA in both themes (78 pairs each).

### Primary
- **Tide Mark Blue** (#1d5fbf; dark #7aa7f0): new-since-last-visit only: the dot, the count, the left-off line. Also the focus ring.

### Neutral
- **Fog Ground** (#f2f4f7; dark #0b0c0e): page ground
- **Card White** (#ffffff; dark #15171a): cards, sheets, inputs on desktop
- **Mist Step** (#e8ebf0; dark #1e2125): search field, monograms, selected nav, badges
- **Ledger Ink** (#0a0a0a; dark #f4f5f6): titles, body, primary button fill
- **Graphite** (#5d6067; dark #a1a5ab): authors, meta, counts
- **Hairline** (#e2e5ea; dark #24272c): card hairlines
- **Rule Grey** (#c4c8cf; dark #40444b): empty register dots, rules inside wells
- **Input Edge** (#83878f; dark #6f747d): input and toggle edges (3:1)

### Status
- **Retraction Red** (#b42318; badge #8a1c12 on #fdecea): retractions and destructive actions.
- **Kelp Green** (#1f7a4d) and **Ochre** (#8a5a00): tool maintenance and confirmations only.

### Topic code
Thirteen OKLCH hues at matched lightness (violet and indigo skipped), each with a fixed glyph: Compound and coastal flooding (circle), Storms, surge and waves (square), Sea level and tides (triangle-up), Subsidence and vertical land motion (diamond), Shoreline change and erosion (triangle-down), Coastal geotechnics (pentagon), Extreme value analysis (hexagon), Ocean–climate drivers (plus), Flood hazard, risk and impacts (cross), Adaptation planning (ring), Numerical models and GeoAI (half-disc), Monitoring and forecasting (bar), Hydrology and water resources (star4). Ink on tint ≥ 6.1:1 in both themes.

### Named Rules
**The One Tide Rule.** The accent marks only what is new since the last visit: the new dot, the new count, the left-off line. Never a button, never a link, never decoration.
**The Shape-and-Word Rule.** A topic is always shown with its shape and, where space allows, its name. Colour alone never carries a topic.
**The Honest Zero Rule.** Zeros print as zeros in muted ink; missing values are a dash; nothing is styled as a signal unless it is one.

## Typography

**Display Font:** Newsreader (Georgia fallback), paper titles only
**Body Font:** Geist (system-ui fallback)
**Label/Mono Font:** Geist Mono, DOIs and IDs only

**Character:** a book serif for the thing being read, a precise grotesk for the tool around it.

### Hierarchy
- **sheet-title** (500, 24px, 30px): paper title in the sheet (balanced wrap)
- **h1** (700, 22px, 28px): screen title
- **card-title** (500, 18px, 24px): paper title on cards, clamped at 4 lines
- **abstract** (400, 16px, 26px): abstract text, max 68ch, pretty wrap
- **body** (400, 14px, 20px): interface text
- **small** (400, 13px, 18px): authors, secondary
- **meta** (500, 12px, 16px): counts, labels, register names

### Named Rules
**The Serif-Is-For-Papers Rule.** Newsreader sets paper titles and nothing else in the interface. Tools, settings and labels are Geist.

## Layout

Phone: 16px gutters, 56px header, 56px tab bar (+ safe area), 4 visible tabs (Tools hidden until v1.5). Desktop ≥1024px: 232px labelled sidebar, content max 1180px, a 300px sticky rail beside the feed. Spacing on a 4px base (4, 8, 12, 16, 24, 32, 48, 64). Breakpoints sm 640px, md 768px, lg 1024px, xl 1280px.

## Elevation & Depth

Flat by default; depth is a tone step (fog → white → mist). Only floating layers cast shadows.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 -8px 28px rgba(10,12,16,.12)`; dark `0 -8px 28px rgba(0,0,0,.50)`): bottom sheets and the paper panel.
- **Pop** (`box-shadow: 0 12px 32px rgba(10,12,16,.14)`): popovers, toasts.

### Named Rules
**The Flat-At-Rest Rule.** Nothing at rest casts a shadow. Elevation exists only for what floats: sheets, popovers, toasts.

## Shapes

Tight radii: chips 6px, controls and cards 8px, popovers 12px, sheets 16px (top corners). Circles only for the new dot, avatars and radios.

## Components

Full specs and states: `replica/design/components.md`.

### Buttons
- **Primary:** ink fill, white label, 48px, radius 8; the one primary per sheet (Open article). Press scales to 0.98.
- **Icon buttons:** 40–44px, muted icon, no fill; press scales to 0.94.

### Chips
- **Filter chip:** white, 1px hairline, 36px, radius 6. **New-since chip** leads the row, count in Tide Mark Blue (muted at zero).
- **Topic chip:** tint fill, ink-of-hue text, glyph; 24px; max 4 in the sheet.

### Cards / Containers
- **PaperCard:** white, 1px hairline, radius 8: monogram, journal, date, new dot; serif title; authors; topic register; badges.

### Inputs / Fields
- **Search:** mist fill, 44px phone / 36px desktop, 16px text, leading icon, placeholder 'Search papers'.

### Navigation
- **Tab bar** (phone) and **labelled sidebar** (desktop); active = ink + mist pill; re-tap Explore twice to focus search.

### Topic Register (signature)
- Thirteen 12px slots in fixed order; tagged slots show the topic glyph in its hue, empty slots a 3px dot; the top two names follow.

## Do's and Don'ts

### Do:
- Do use role tokens (bg-surface, text-text-muted), never hex in components.
- Do show a retraction first, in plain words, wherever the paper appears.
- Do keep every touch target at least 44px and every input at 16px.
- Do put the primary action on the visible bottom edge of any sheet.
- Do format every number with Intl (separators, plurals) and tabular figures.

### Don't:
- Don't use the accent for buttons, links, selection or emphasis.
- Don't add shadows, gradients, glass or glows to resting surfaces.
- Don't truncate dates, counts or DOIs; wrap them.
- Don't use a coloured left bar on cards, a dark-teal theme, or a mascot.
- Don't animate content in: motion is feedback (press, sheets, toasts) only.
