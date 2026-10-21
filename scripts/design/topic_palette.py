"""Generate 13 topic colour pairs (ink + tint) for light and dark themes from OKLCH, and verify WCAG AA.

Ink text must reach 4.5:1 on its tint AND on the theme's page/surface grounds; the glyph (non-text)
must reach 3:1 on the surface. Violet/indigo hues (265-305 deg) are skipped (house rule).
Usage: python3 scripts/design/topic_palette.py  -> prints JSON + a pass/fail table.
"""
import json, math

HUES = [25, 50, 75, 100, 125, 150, 175, 198, 218, 238, 255, 322, 345]
THEMES = {
    "light": {"ink": (0.44, 0.115), "tint": (0.955, 0.032), "grounds": ["#ffffff", "#fbfaf8", "#f2f4f7", "#f4f5f6"]},
    "dark":  {"ink": (0.84, 0.095), "tint": (0.29, 0.045),  "grounds": ["#111111", "#161514", "#15171a", "#16181a", "#0b0c0e"]},
}

def oklch_to_srgb(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_, m_, s_ = L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    rgb = (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    def enc(x):
        x = min(max(x, 0.0), 1.0)
        return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return tuple(round(enc(c) * 255) for c in rgb)

def hexc(rgb): return "#%02x%02x%02x" % rgb
def lum(hx):
    r, g, b = (int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

def build():
    out, fails = {}, []
    for theme, cfg in THEMES.items():
        rows = []
        for i, h in enumerate(HUES, start=1):
            L, C = cfg["ink"]
            ink = hexc(oklch_to_srgb(L, C, h))
            # step lightness until ink passes 4.5 on tint and all grounds (keeps hue, adjusts only L)
            tint = hexc(oklch_to_srgb(*cfg["tint"], h))
            step = -0.01 if theme == "light" else 0.01
            while min(contrast(ink, g) for g in cfg["grounds"] + [tint]) < 4.6:
                L += step; ink = hexc(oklch_to_srgb(L, C, h))
            worst = min(contrast(ink, g) for g in cfg["grounds"] + [tint])
            if worst < 4.5: fails.append((theme, i))
            rows.append({"id": i, "hue": h, "ink": ink, "tint": tint, "min_contrast": round(worst, 2)})
        out[theme] = rows
    return out, fails

if __name__ == "__main__":
    pal, fails = build()
    print(json.dumps(pal, indent=1))
    print("FAILS:", fails or "none")
