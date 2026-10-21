"""Resolve journal ISSNs via the Crossref /journals endpoint (polite pool).

One-off research script. Output: data/journals.json. Rows without an exact
normalised title match are flagged `verified: false` for manual review.
"""
import json, re, sys, time, unicodedata, urllib.parse, urllib.request

MAILTO = sys.argv[1]
SRC = "scripts/research/journal_names.json"
OUT = "data/journals.json"
DELAY_S = 0.25

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = s.replace("&", "and").replace("the ", "")
    return re.sub(r"[^a-z0-9]", "", s)

def lookup(name):
    q = urllib.parse.urlencode({"query": name, "rows": 10, "mailto": MAILTO})
    req = urllib.request.Request(f"https://api.crossref.org/journals?{q}",
                                 headers={"User-Agent": f"coastal-hub-research/0.1 (mailto:{MAILTO})"})
    with urllib.request.urlopen(req, timeout=30) as r:
        items = json.load(r)["message"]["items"]
    for it in items:
        if norm(it["title"]) == norm(name):
            return it, True
    return (items[0] if items else None), False

def main():
    groups = json.load(open(SRC))
    out = []
    for group, names in groups.items():
        for name in names:
            try:
                it, exact = lookup(name)
            except Exception as e:  # network or parse error: record it, keep going
                out.append({"name": name, "group": group, "verified": False, "error": str(e)})
                continue
            issns = {t["type"]: t["value"] for t in (it or {}).get("issn-type", [])}
            out.append({"name": name, "group": group,
                        "crossref_title": it and it["title"], "publisher": it and it["publisher"],
                        "issn_print": issns.get("print"), "issn_electronic": issns.get("electronic"),
                        "issns": (it or {}).get("ISSN", []), "verified": exact,
                        "verified_via": "crossref /journals exact title", "is_preprint": False})
            time.sleep(DELAY_S)
    json.dump(out, open(OUT, "w"), indent=1, ensure_ascii=False)
    bad = [o["name"] for o in out if not o["verified"]]
    print(f"{len(out)} journals, {len(bad)} unverified:", *bad, sep="\n  ")

main()
