"""One contact sheet per direction: rows = screens, columns = phone light/dark, desktop light/dark."""
import sys
from PIL import Image, ImageDraw
ROOT = "replica/design/directions"
H = 760   # row height in px
for d in ("folio", "gauge", "ledger"):
    rows = []
    for screen in ("feed", "paper", "region"):
        tiles = [Image.open(f"{ROOT}/{d}/{screen}-{vp}-{t}.png").convert("RGB") for vp in ("phone", "desktop") for t in ("light", "dark")]
        tiles = [im.resize((int(im.width * H / im.height), H)) for im in tiles]
        row = Image.new("RGB", (sum(t.width for t in tiles) + 24 * 5, H + 48), "#888888")
        x = 24
        for t in tiles: row.paste(t, (x, 24)); x += t.width + 24
        rows.append(row)
    W = max(r.width for r in rows)
    sheet = Image.new("RGB", (W, sum(r.height for r in rows)), "#888888")
    y = 0
    for r in rows: sheet.paste(r, (0, y)); y += r.height
    sheet.save(f"{ROOT}/{d}/contact-sheet.jpg", quality=82)
    print(d, sheet.size)
