"""Generate CSS custom properties + the Tailwind v4 @theme mapping from replica/design/tokens.json.

Writes replica/design/tokens.css (and, when given, a copy to the app: `--app src/styles/tokens.css`).
Runtime vars are --c-<role>; Tailwind maps --color-<role> -> var(--c-<role>), so classes like
bg-surface / text-text-muted follow the theme without dark: variants. Never edit the output by hand.
"""
import json, sys

t = json.load(open("replica/design/tokens.json"))

def block(cols):
    return "\n".join(f"  --c-{k}: {v};" for k, v in cols.items())

out = ["/* GENERATED from replica/design/tokens.json by scripts/design/build_tokens_css.py. Do not edit. */",
       ":root {", "  color-scheme: light;", block(t["color"]),
       f"  --elev-float: {t['elevation']['float-light']};", f"  --elev-pop: {t['elevation']['pop-light']};",
       f"  --scrim-opacity: {t['scrim-opacity']['light']};", "}",
       "@media (prefers-color-scheme: dark) {", '  :root:not([data-theme="light"]) {', "    color-scheme: dark;",
       "\n".join("  " + line for line in block(t["color-dark"]).splitlines()),
       f"    --elev-float: {t['elevation']['float-dark']};", f"    --elev-pop: {t['elevation']['pop-dark']};",
       f"    --scrim-opacity: {t['scrim-opacity']['dark']};", "  }", "}",
       ':root[data-theme="dark"] {', "  color-scheme: dark;", block(t["color-dark"]),
       f"  --elev-float: {t['elevation']['float-dark']};", f"  --elev-pop: {t['elevation']['pop-dark']};",
       f"  --scrim-opacity: {t['scrim-opacity']['dark']};", "}", ""]

m = t["motion"]
theme = ["@theme inline {"]
theme += [f"  --color-{k}: var(--c-{k});" for k in t["color"]]
theme += [f"  --font-{k}: {v};" for k, v in t["font"].items() if not k.startswith("_") and isinstance(v, str)]
for name, s in t["type"].items():
    if name.startswith("_"): continue
    theme += [f"  --text-{name}: {s['size']}px;", f"  --text-{name}--line-height: {s['line']}px;", f"  --text-{name}--font-weight: {s['weight']};"]
theme += [f"  --radius-{k}: {v}px;" for k, v in t["radius"].items()]
theme += ["  --spacing: 4px;"]
theme += [f"  --ease-{k}: {v};" for k, v in m["ease"].items()]
theme += [f"  --duration-{k}: {v};" for k, v in m["duration"].items()]
theme += [f"  --breakpoint-{k}: {v}px;" for k, v in t["layout"]["breakpoints"].items()]
theme += ["}", ""]
theme += ["/* typesetting rules from tokens.type._wrap/_dark */",
          ".font-title, h1, h2, h3 { text-wrap: balance; }",
          ".prose-abstract { text-wrap: pretty; max-width: 68ch; }",
          ':root[data-theme="dark"] body { letter-spacing: 0.005em; }',
          '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) body { letter-spacing: 0.005em; } }', ""]
css = "\n".join(out + theme)
open("replica/design/tokens.css", "w").write(css)
if "--app" in sys.argv:
    dest = sys.argv[sys.argv.index("--app") + 1]
    open(dest, "w").write(css)
print("tokens.css:", len(css.splitlines()), "lines")
