"""Write replica/design/tokens.json, the single source of truth for design tokens (Ledger + topic register).

Topic colours come from replica/design/directions/_data/topic-palette.json (verified by topic_palette.py).
Re-run after changing any value here, then: scripts/design/check_contrast.sh
"""
import json

PAL = json.load(open("replica/design/directions/_data/topic-palette.json"))
TOPICS = json.load(open("data/topics.json"))["topics"]

LIGHT = {
    "bg": "#f2f4f7", "surface": "#ffffff", "raised": "#e8ebf0", "sheet": "#ffffff", "scrim": "#0a0c10",
    "text": "#0a0a0a", "text-muted": "#5d6067", "border": "#e2e5ea", "border-strong": "#c4c8cf", "border-input": "#83878f",
    "primary": "#0a0a0a", "on-primary": "#ffffff", "accent": "#1d5fbf", "on-accent": "#ffffff", "focus": "#1d5fbf",
    "success": "#1f7a4d", "warning": "#8a5a00", "danger": "#b42318", "info": "#1d5fbf", "selected": "#e8ebf0",
    "badge-oa-bg": "#e8ebf0", "badge-oa-text": "#0a0a0a",
    "badge-preprint-bg": "#e8ebf0", "badge-preprint-text": "#3d4047",
    "badge-retracted-bg": "#fdecea", "badge-retracted-text": "#8a1c12",
}
DARK = {
    "bg": "#0b0c0e", "surface": "#15171a", "raised": "#1e2125", "sheet": "#15171a", "scrim": "#000000",
    "text": "#f4f5f6", "text-muted": "#a1a5ab", "border": "#24272c", "border-strong": "#40444b", "border-input": "#6f747d",
    "primary": "#f4f5f6", "on-primary": "#0b0c0e", "accent": "#7aa7f0", "on-accent": "#0b0c0e", "focus": "#7aa7f0",
    "success": "#4cc38a", "warning": "#e0a33a", "danger": "#f2706a", "info": "#7aa7f0", "selected": "#1e2125",
    "badge-oa-bg": "#1e2125", "badge-oa-text": "#f4f5f6",
    "badge-preprint-bg": "#1e2125", "badge-preprint-text": "#c9ccd1",
    "badge-retracted-bg": "#3a1714", "badge-retracted-text": "#ffb4ab",
}
for theme, cols in (("light", LIGHT), ("dark", DARK)):
    for r in PAL[theme]:
        cols[f"topic-{r['id']}"] = r["ink"]; cols[f"topic-{r['id']}-tint"] = r["tint"]

def pairs():
    p = [["text", g] for g in ("bg", "surface", "raised", "sheet")]
    p += [["text-muted", g] for g in ("bg", "surface", "raised", "sheet")]
    p += [["accent", "bg"], ["accent", "surface"], ["on-accent", "accent"], ["on-primary", "primary"],
          ["success", "surface"], ["warning", "surface"], ["danger", "surface"], ["danger", "bg"], ["info", "surface"], ["text", "selected"],
          ["badge-oa-text", "badge-oa-bg"], ["badge-preprint-text", "badge-preprint-bg"], ["badge-retracted-text", "badge-retracted-bg"],
          ["border-input", "bg", "ui"], ["border-input", "surface", "ui"], ["focus", "bg", "ui"], ["focus", "surface", "ui"], ["focus", "sheet", "ui"]]
    for i in range(1, 14):
        p += [[f"topic-{i}", f"topic-{i}-tint"], [f"topic-{i}", "surface"], [f"topic-{i}", "bg"], [f"topic-{i}", "sheet"]]
    return p

tokens = {
    "_about": "Single source of truth (D024: Ledger + topic register). Names are roles; /replica-brand may change values, never names. Check: scripts/design/check_contrast.sh",
    "color": LIGHT,
    "color-dark": DARK,
    "pairs": pairs(),
    "topics": [{"id": t["id"], "name": t["name"], "glyph": g} for t, g in zip(TOPICS,
               ["circle", "square", "triangle-up", "diamond", "triangle-down", "pentagon", "hexagon", "plus", "cross", "ring", "half-disc", "bar", "star4"])],
    "font": {
        "title": "var(--nf-title), \"Newsreader\", Georgia, \"Times New Roman\", serif",
        "sans": "var(--nf-sans), \"Geist\", system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
        "mono": "var(--nf-mono), \"Geist Mono\", ui-monospace, SFMono-Regular, Menlo, monospace",
        "_licence": "All SIL Open Font License 1.1 (Google Fonts). Serif = paper titles and the abstract on desktop; sans = all UI; mono = DOIs and IDs only.",
        "_figures": "tabular-nums everywhere numbers align or update",
        "load": {"Newsreader": "opsz 6..72, wght 400;500", "Geist": "400;500;700", "Geist Mono": "400"},
        "_loading": "self-host via next/font (display: swap, size-adjusted fallbacks) so text never disappears or reflows",
    },
    "type": {
        "meta":        {"size": 12, "line": 16, "weight": 500, "family": "sans"},
        "small":       {"size": 13, "line": 18, "weight": 400, "family": "sans"},
        "body":        {"size": 14, "line": 20, "weight": 400, "family": "sans"},
        "input":       {"size": 16, "line": 24, "weight": 400, "family": "sans", "_note": "16px minimum on inputs: no iOS zoom"},
        "abstract":    {"size": 16, "line": 26, "weight": 400, "family": "sans"},
        "card-title":  {"size": 18, "line": 24, "weight": 500, "family": "title"},
        "h1":          {"size": 22, "line": 28, "weight": 700, "family": "sans"},
        "sheet-title": {"size": 24, "line": 30, "weight": 500, "family": "title", "tracking": "-0.01em"},
        "_wrap": {"titles": "text-wrap: balance", "abstract": "text-wrap: pretty", "measure": "abstract max 68ch"},
        "_dark": "light-on-dark: +0.005em tracking on body/small, abstract line +1px (handled in tokens.css)",
        "_roles": "meta 12/500 (counts, labels) and small 13/400 muted (authors) are separated by weight and tone, not size alone",
    },
    "space": [0, 4, 8, 12, 16, 24, 32, 48, 64],
    "radius": {"chip": 6, "control": 8, "card": 8, "pop": 12, "sheet": 16, "pill": 999},
    "elevation": {
        "rest": "none",
        "float-light": "0 -8px 28px rgba(10,12,16,.12)",
        "float-dark": "0 -8px 28px rgba(0,0,0,.50)",
        "pop-light": "0 12px 32px rgba(10,12,16,.14)",
        "pop-dark": "0 12px 32px rgba(0,0,0,.55)",
        "_rule": "Nothing at rest casts a shadow. Only what floats: sheets, popovers, toasts.",
    },
    "scrim-opacity": {"light": 0.30, "dark": 0.55},
    "motion": {
        "duration": {"press": "120ms", "fast": "150ms", "base": "200ms", "slow": "300ms"},
        "ease": {"out": "cubic-bezier(0.23, 1, 0.32, 1)", "in-out": "cubic-bezier(0.77, 0, 0.175, 1)", "drawer": "cubic-bezier(0.32, 0.72, 0, 1)"},
        "spring": {
            "sheet-open":  {"damping": 1.0, "response": 0.38},
            "sheet-close": {"damping": 1.0, "response": 0.30},
            "sheet-flick": {"damping": 0.8, "response": 0.32, "_when": "release velocity > 600px/s"},
            "settle":      {"damping": 1.0, "response": 0.35},
        },
        "press-scale": {"button": 0.97, "icon": 0.94, "primary": 0.98},
        "gesture": {"drag-threshold-px": 8, "flick-dismiss-velocity": 0.11, "projection-deceleration": 0.998, "rubberband-constant": 0.55},
        "reduced": {"_rule": "prefers-reduced-motion: no translate or scale; sheets and toasts cross-fade", "fade": "200ms ease"},
    },
    "layout": {
        "breakpoints": {"sm": 640, "md": 768, "lg": 1024, "xl": 1280},
        "gutter-phone": 16, "header": 56, "tabbar": 56, "sidebar": 232, "content-max": 1180, "rail": 300,
        "sheet-detents": {"phone": [0.6, 1.0], "_note": "fractions of 92dvh; desktop = right panel min(560px, 44vw)"},
        "touch-target-min": 44, "chip-height": 36, "control-height": 36, "row-min": 48,
    },
    "register": {
        "_about": "Gauge's 13-slot topic register on cards (D024): one fixed slot per topic id, filled with the topic glyph in topic ink; empty slot is a 3px dot in border-strong.",
        "slot": 12, "gap": 2, "glyph": 10, "empty-dot": 3, "max-named": 2,
    },
}
json.dump(tokens, open("replica/design/tokens.json", "w"), indent=1, ensure_ascii=False)
print("tokens.json written:", len(LIGHT), "light roles,", len(DARK), "dark roles,", len(tokens["pairs"]), "pairs")
