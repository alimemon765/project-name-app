"""Generate DESIGN.md (+ .impeccable/design.json sidecar) from replica/design/tokens.json.

tokens.json stays the source of truth (section 0.1); this file is a readable, portable view of it.
Before deploy, re-run /impeccable document in scan mode against the shipped code.
"""
import json, math, datetime

t = json.load(open("replica/design/tokens.json"))
L, D = t["color"], t["color-dark"]

def hex_to_oklch(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    Lk = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return Lk, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360

def ramp(h):
    _, C, H = hex_to_oklch(h)
    return [f"oklch({l}% {C:.3f} {H:.1f})" for l in (15, 27, 39, 51, 63, 75, 87, 95)]

NAMES = {"bg": "Fog Ground", "surface": "Card White", "raised": "Mist Step", "text": "Ledger Ink", "text-muted": "Graphite",
         "border": "Hairline", "border-strong": "Rule Grey", "border-input": "Input Edge", "accent": "Tide Mark Blue",
         "danger": "Retraction Red", "success": "Kelp Green", "warning": "Ochre"}
KEYS = ["bg", "surface", "raised", "text", "text-muted", "border", "border-strong", "border-input", "accent", "on-accent",
        "primary", "on-primary", "focus", "success", "warning", "danger", "badge-retracted-bg", "badge-retracted-text"]
fm = ["---", "name: PROJECT_NAME", "description: A calm, open research ledger for coastal, flood and hydrology science.", "colors:"]
fm += [f'  {k}: "{L[k]}"' for k in KEYS] + [f'  {k}-dark: "{D[k]}"' for k in KEYS]
fm += [f'  topic-{i}: "{L[f"topic-{i}"]}"' for i in range(1, 14)]
fm += ["typography:"]
fam = {k: v for k, v in t["font"].items() if isinstance(v, str) and not k.startswith("_")}
for name, s in t["type"].items():
    if name.startswith("_"): continue
    fm += [f"  {name}:", f'    fontFamily: "{fam[s["family"]].replace(chr(34), "")}"', f'    fontSize: "{s["size"]}px"',
           f"    fontWeight: {s['weight']}", f'    lineHeight: "{s["line"]}px"'] + ([f'    letterSpacing: "{s["tracking"]}"'] if "tracking" in s else [])
fm += ["rounded:"] + [f'  {k}: "{v}px"' for k, v in t["radius"].items()]
fm += ["spacing:"] + [f'  s{v}: "{v}px"' for v in t["space"] if v]
fm += ["components:",
       "  paper-card:", '    backgroundColor: "{colors.surface}"', '    textColor: "{colors.text}"', '    rounded: "{rounded.card}"', '    padding: "14px 8px 14px 14px"',
       "  button-primary:", '    backgroundColor: "{colors.primary}"', '    textColor: "{colors.on-primary}"', '    rounded: "{rounded.control}"', '    height: "48px"',
       "  filter-chip:", '    backgroundColor: "{colors.surface}"', '    textColor: "{colors.text}"', '    rounded: "{rounded.chip}"', '    height: "36px"',
       "  badge-retracted:", '    backgroundColor: "{colors.badge-retracted-bg}"', '    textColor: "{colors.badge-retracted-text}"', '    rounded: "{rounded.chip}"', '    height: "24px"',
       "  search-field:", '    backgroundColor: "{colors.raised}"', '    textColor: "{colors.text}"', '    rounded: "{rounded.control}"', '    height: "44px"',
       "  nav-item-active:", '    backgroundColor: "{colors.raised}"', '    textColor: "{colors.text}"', '    rounded: "{rounded.control}"', '    height: "34px"',
       "---", ""]

NORTH = "The Tide Ledger"
OVERVIEW = ("New research arrives in tides, every few hours, from 130 journals. This interface is the ledger a careful researcher keeps of what came in: "
            "ink on fog, entries on plain white cards, and exactly one coloured mark for the only thing that changes between visits, what is new. "
            "It is a working tool for daily use, so precision and restraint carry the identity, not decoration.\n\n"
            "Density is medium: about two and a half papers per phone screen, every title set in a reading serif so it can be scanned rather than decoded. "
            "Topics are a data code, not a palette: thirteen fixed slots, each with its own shape and hue, so a paper's research areas can be read at a glance and never by colour alone. "
            "It must never resemble the reference app it rebuilds: no dark-teal default, no mascot, no coloured bar down the side of a card.")
KEY = ["Ink chrome on a fog ground; white cards with a 1px hairline, no shadows at rest",
       "One data hue (Tide Mark Blue) reserved for new-since-last-visit",
       "Serif titles (Newsreader), sans interface (Geist), mono only for DOIs (Geist Mono)",
       "The 13-slot topic register: fixed position + shape + hue + name",
       "Light and dark are equal; dark is designed, not inverted"]
RULES = [("The One Tide Rule", "The accent marks only what is new since the last visit: the new dot, the new count, the left-off line. Never a button, never a link, never decoration.", "colors"),
         ("The Shape-and-Word Rule", "A topic is always shown with its shape and, where space allows, its name. Colour alone never carries a topic.", "colors"),
         ("The Honest Zero Rule", "Zeros print as zeros in muted ink; missing values are a dash; nothing is styled as a signal unless it is one.", "colors"),
         ("The Serif-Is-For-Papers Rule", "Newsreader sets paper titles and nothing else in the interface. Tools, settings and labels are Geist.", "typography"),
         ("The Flat-At-Rest Rule", "Nothing at rest casts a shadow. Elevation exists only for what floats: sheets, popovers, toasts.", "elevation")]
DOS = ["Do use role tokens (bg-surface, text-text-muted), never hex in components.",
       "Do show a retraction first, in plain words, wherever the paper appears.",
       "Do keep every touch target at least 44px and every input at 16px.",
       "Do put the primary action on the visible bottom edge of any sheet.",
       "Do format every number with Intl (separators, plurals) and tabular figures."]
DONTS = ["Don't use the accent for buttons, links, selection or emphasis.",
         "Don't add shadows, gradients, glass or glows to resting surfaces.",
         "Don't truncate dates, counts or DOIs; wrap them.",
         "Don't use a coloured left bar on cards, a dark-teal theme, or a mascot.",
         "Don't animate content in: motion is feedback (press, sheets, toasts) only."]

md = fm + [f"# Design System: PROJECT_NAME", "", "> Generated from `replica/design/tokens.json` (the source of truth) by `scripts/design/write_design_md.py`. Re-run `/impeccable document` against shipped code before deploy.", "",
  "## Overview", "", f'**Creative North Star: "{NORTH}"** *(proposed; pending Ali\'s confirmation)*', "", OVERVIEW, "", "**Key Characteristics:**"] + [f"- {k}" for k in KEY] + ["",
  "## Colors", "", "Ink and fog, one tide-blue mark, and a thirteen-hue data code for topics; every pair passes WCAG AA in both themes (78 pairs each).", "",
  "### Primary", f"- **Tide Mark Blue** ({L['accent']}; dark {D['accent']}): new-since-last-visit only: the dot, the count, the left-off line. Also the focus ring.", "",
  "### Neutral"] + [f"- **{NAMES[k]}** ({L[k]}; dark {D[k]}): {r}" for k, r in [
    ("bg", "page ground"), ("surface", "cards, sheets, inputs on desktop"), ("raised", "search field, monograms, selected nav, badges"),
    ("text", "titles, body, primary button fill"), ("text-muted", "authors, meta, counts"), ("border", "card hairlines"),
    ("border-strong", "empty register dots, rules inside wells"), ("border-input", "input and toggle edges (3:1)")]] + ["",
  "### Status", f"- **Retraction Red** ({L['danger']}; badge {L['badge-retracted-text']} on {L['badge-retracted-bg']}): retractions and destructive actions.",
  f"- **Kelp Green** ({L['success']}) and **Ochre** ({L['warning']}): tool maintenance and confirmations only.", "",
  "### Topic code", "Thirteen OKLCH hues at matched lightness (violet and indigo skipped), each with a fixed glyph: " + ", ".join(f"{x['name']} ({x['glyph']})" for x in t["topics"]) + ". Ink on tint ≥ 6.1:1 in both themes.", "",
  "### Named Rules"] + [f"**{n}.** {b}" for n, b, s in RULES if s == "colors"] + ["",
  "## Typography", "", "**Display Font:** Newsreader (Georgia fallback), paper titles only", "**Body Font:** Geist (system-ui fallback)", "**Label/Mono Font:** Geist Mono, DOIs and IDs only", "",
  "**Character:** a book serif for the thing being read, a precise grotesk for the tool around it.", "", "### Hierarchy"] + [
  f"- **{n}** ({s['weight']}, {s['size']}px, {s['line']}px): {p}" for n, s, p in [(k, t['type'][k], d) for k, d in [
    ("sheet-title", "paper title in the sheet (balanced wrap)"), ("h1", "screen title"), ("card-title", "paper title on cards, clamped at 4 lines"),
    ("abstract", "abstract text, max 68ch, pretty wrap"), ("body", "interface text"), ("small", "authors, secondary"), ("meta", "counts, labels, register names")]]] + ["",
  "### Named Rules"] + [f"**{n}.** {b}" for n, b, s in RULES if s == "typography"] + ["",
  "## Layout", "", f"Phone: 16px gutters, 56px header, 56px tab bar (+ safe area), 4 visible tabs (Tools hidden until v1.5). Desktop ≥1024px: 232px labelled sidebar, content max {t['layout']['content-max']}px, a {t['layout']['rail']}px sticky rail beside the feed. Spacing on a 4px base ({', '.join(map(str, t['space'][1:]))}). Breakpoints {', '.join(f'{k} {v}px' for k, v in t['layout']['breakpoints'].items())}.", "",
  "## Elevation & Depth", "", "Flat by default; depth is a tone step (fog → white → mist). Only floating layers cast shadows.", "",
  "### Shadow Vocabulary", f"- **Float** (`box-shadow: {t['elevation']['float-light']}`; dark `{t['elevation']['float-dark']}`): bottom sheets and the paper panel.",
  f"- **Pop** (`box-shadow: {t['elevation']['pop-light']}`): popovers, toasts.", "", "### Named Rules"] + [f"**{n}.** {b}" for n, b, s in RULES if s == "elevation"] + ["",
  "## Shapes", "", f"Tight radii: chips {t['radius']['chip']}px, controls and cards {t['radius']['control']}px, popovers {t['radius']['pop']}px, sheets {t['radius']['sheet']}px (top corners). Circles only for the new dot, avatars and radios.", "",
  "## Components", "", "Full specs and states: `replica/design/components.md`.", "",
  "### Buttons", "- **Primary:** ink fill, white label, 48px, radius 8; the one primary per sheet (Open article). Press scales to 0.98.", "- **Icon buttons:** 40–44px, muted icon, no fill; press scales to 0.94.", "",
  "### Chips", "- **Filter chip:** white, 1px hairline, 36px, radius 6. **New-since chip** leads the row, count in Tide Mark Blue (muted at zero).", "- **Topic chip:** tint fill, ink-of-hue text, glyph; 24px; max 4 in the sheet.", "",
  "### Cards / Containers", "- **PaperCard:** white, 1px hairline, radius 8: monogram, journal, date, new dot; serif title; authors; topic register; badges.", "",
  "### Inputs / Fields", "- **Search:** mist fill, 44px phone / 36px desktop, 16px text, leading icon, placeholder 'Search papers'.", "",
  "### Navigation", "- **Tab bar** (phone) and **labelled sidebar** (desktop); active = ink + mist pill; re-tap Explore twice to focus search.", "",
  "### Topic Register (signature)", "- Thirteen 12px slots in fixed order; tagged slots show the topic glyph in its hue, empty slots a 3px dot; the top two names follow.", "",
  "## Do's and Don'ts", "", "### Do:"] + [f"- {x}" for x in DOS] + ["", "### Don't:"] + [f"- {x}" for x in DONTS] + [""]
open("DESIGN.md", "w").write("\n".join(md))

side = {"schemaVersion": 2, "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "title": "Design System: PROJECT_NAME",
  "extensions": {
    "colorMeta": {k: {"role": "primary" if k == "accent" else "neutral", "displayName": NAMES.get(k, k), "tonalRamp": ramp(L[k])} for k in ["bg", "surface", "raised", "text", "text-muted", "border", "accent", "danger"]},
    "typographyMeta": {k: {"displayName": k, "purpose": p} for k, p in [("card-title", "Paper titles on cards"), ("sheet-title", "Paper title in the sheet"), ("body", "Interface"), ("meta", "Counts and labels")]},
    "shadows": [{"name": "float", "value": t["elevation"]["float-light"], "purpose": "Sheets and the paper panel."}, {"name": "pop", "value": t["elevation"]["pop-light"], "purpose": "Popovers, toasts."}],
    "motion": [{"name": f"ease-{k}", "value": v, "purpose": "UI easing"} for k, v in t["motion"]["ease"].items()] +
              [{"name": f"spring-{k}", "value": json.dumps(v), "purpose": "Sheet physics (damping ratio, response s)"} for k, v in t["motion"]["spring"].items()],
    "breakpoints": [{"name": k, "value": f"{v}px"} for k, v in t["layout"]["breakpoints"].items()]},
  "components": [
    {"name": "Primary Button", "kind": "button", "refersTo": "button-primary", "description": "The one primary action per sheet.",
     "html": '<button class="ds-btn-primary">Open article ↗</button>',
     "css": f".ds-btn-primary{{background:{L['primary']};color:{L['on-primary']};height:48px;padding:0 24px;border:0;border-radius:8px;font:600 14px Geist,system-ui,sans-serif;transition:transform 120ms cubic-bezier(.23,1,.32,1)}}.ds-btn-primary:active{{transform:scale(.98)}}.ds-btn-primary:focus-visible{{outline:2px solid {L['focus']};outline-offset:2px}}"},
    {"name": "Filter Chip", "kind": "chip", "refersTo": "filter-chip", "description": "Sort and filter chips in the sticky row.",
     "html": '<button class="ds-chip">All regions ▾</button> <button class="ds-chip ds-new"><b>6</b> new since Tue</button>',
     "css": f".ds-chip{{background:{L['surface']};color:{L['text']};border:1px solid {L['border']};height:36px;padding:0 12px;border-radius:6px;font:14px Geist,system-ui,sans-serif}}.ds-chip:hover{{border-color:{L['border-strong']}}}.ds-chip:focus-visible{{outline:2px solid {L['focus']};outline-offset:2px}}.ds-new b{{color:{L['accent']}}}"},
    {"name": "Paper Card", "kind": "card", "refersTo": "paper-card", "description": "One paper in the feed, with the topic register.",
     "html": '<article class="ds-card"><div class="ds-meta"><span class="ds-mono">Co</span> NHESS · 19 Oct <span class="ds-dot"></span></div><h3 class="ds-title">Application of radar remote sensing for cyclone damage mapping in Bangladesh</h3><p class="ds-by">Shadmin Islam Prova, Md. Shahoriar Sarker and 1 other</p><div class="ds-reg"><i style="color:' + L["topic-1"] + '">●</i><i style="color:' + L["topic-2"] + '">■</i><i class="e"></i><i class="e"></i><span>Compound flooding · Storm surge and waves</span></div></article>',
     "css": f".ds-card{{background:{L['surface']};border:1px solid {L['border']};border-radius:8px;padding:14px;font:14px Geist,system-ui,sans-serif;color:{L['text']}}}.ds-meta{{display:flex;gap:6px;align-items:center;color:{L['text-muted']};font-size:13px}}.ds-mono{{display:grid;place-items:center;width:28px;height:28px;border-radius:6px;background:{L['raised']};color:{L['text']};font-weight:700;font-size:10.5px}}.ds-dot{{width:8px;height:8px;border-radius:50%;background:{L['accent']}}}.ds-title{{font:500 18px/24px Newsreader,Georgia,serif;margin:6px 0 4px}}.ds-by{{color:{L['text-muted']};font-size:13px;margin:0}}.ds-reg{{display:flex;gap:2px;align-items:center;margin-top:10px;font-size:12px;color:{L['text-muted']}}}.ds-reg i{{font-style:normal;width:12px;text-align:center;font-size:10px}}.ds-reg i.e::before{{content:'·';color:{L['border-strong']}}}.ds-reg span{{margin-left:8px}}"},
    {"name": "Search Field", "kind": "input", "refersTo": "search-field", "description": "Feed search; 16px text avoids iOS zoom.",
     "html": '<label class="ds-search"><input placeholder="Search papers"></label>',
     "css": f".ds-search{{display:flex;align-items:center;height:44px;padding:0 12px;border-radius:8px;background:{L['raised']}}}.ds-search input{{border:0;background:none;outline:none;font:16px Geist,system-ui,sans-serif;color:{L['text']};width:100%}}.ds-search:focus-within{{outline:2px solid {L['focus']};outline-offset:2px}}"},
    {"name": "Retracted Badge", "kind": "chip", "refersTo": "badge-retracted", "description": "Always the first badge; the sheet adds a banner.",
     "html": '<span class="ds-retracted">Retracted</span>',
     "css": f".ds-retracted{{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:6px;background:{L['badge-retracted-bg']};color:{L['badge-retracted-text']};font:500 12px Geist,system-ui,sans-serif}}"},
    {"name": "Sidebar Nav Item", "kind": "nav", "refersTo": "nav-item-active", "description": "Desktop navigation; active is a mist pill, never the accent.",
     "html": '<a class="ds-nav ds-on" href="#">Explore</a><a class="ds-nav" href="#">News</a>',
     "css": f".ds-nav{{display:flex;align-items:center;height:34px;padding:0 10px;border-radius:8px;color:{L['text-muted']};text-decoration:none;font:14px Geist,system-ui,sans-serif}}.ds-nav:hover{{color:{L['text']}}}.ds-on{{background:{L['raised']};color:{L['text']}}}.ds-nav:focus-visible{{outline:2px solid {L['focus']};outline-offset:2px}}"}],
  "narrative": {"northStar": NORTH, "overview": OVERVIEW, "keyCharacteristics": KEY,
                "rules": [{"name": n, "body": b, "section": s} for n, b, s in RULES], "dos": DOS, "donts": DONTS}}
json.dump(side, open(".impeccable/design.json", "w"), indent=1, ensure_ascii=False)
print("DESIGN.md + .impeccable/design.json written")
