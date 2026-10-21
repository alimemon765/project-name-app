"""Build the 20-paper fixture for design prototypes from real OpenAlex/Crossref records.

Real metadata only (OpenAlex CC0, Crossref facts). Two clearly flagged worst-case fixtures
(`fixture: true`) cover cases the real sample lacked: a 40-word title and non-Latin author scripts.
Topics/regions come from a tiny keyword stand-in for the real classifier (prototype only).
"""
import json, re, sys

SC, OUT = sys.argv[1], "replica/design/directions/_data/papers.json"
raw = json.load(open(SC + "oa_raw.json")); extra = json.load(open(SC + "oa_extra.json")); es = json.load(open(SC + "essoar.json"))
topics = json.load(open("data/topics.json"))["topics"]
def nk(x): return re.sub(r"[^a-z0-9]", "", x.lower().replace("&", "and"))
GROUP = {nk(o["name"]): o["group"] for o in json.load(open("data/journals.json"))}
ABBR = {"Natural Hazards and Earth System Sciences": "NHESS", "Hydrology and Earth System Sciences": "HESS", "Coastal Engineering": "Coast. Eng.",
        "Water Resources Research": "WRR", "Geophysical Research Letters": "GRL", "Earth System Science Data": "ESSD", "Journal of Hydrology": "J. Hydrol.",
        "Ocean & Coastal Management": "Ocean Coast. Manag.", "Estuarine, Coastal and Shelf Science": "Estuar. Coast. Shelf Sci.", "Earth's Future": "Earth's Future",
        "Journal of Flood Risk Management": "J. Flood Risk Manag.", "Environmental Research Letters": "ERL", "Journal of Hydrology: Regional Studies": "J. Hydrol. Reg. Stud.",
        "Communications Earth & Environment": "Commun. Earth Environ.", "ESS Open Archive": "ESSOAr", "Engineering Geology": "Eng. Geol."}
KW = {1: r"compound flood|coastal flood|inundation", 2: r"storm surge|surge|wave|cyclone|hurricane|typhoon", 3: r"sea level|tide|tidal",
      4: r"subsidence|insar|land motion", 5: r"shoreline|erosion|beach|dune", 6: r"geotechnic|soil|slope|landslide", 7: r"extreme|return period|frequency analysis",
      8: r"climate|enso|ocean|atmospher|warming", 9: r"flood risk|hazard|impact|damage|vulnerab", 10: r"adaptation|resilien|nature-based",
      11: r"model|machine learning|deep learning|neural|simulat", 12: r"observ|forecast|satellite|monitor|gauge|dataset|database", 13: r"hydrolog|runoff|streamflow|groundwater|rainfall|precipitation|drought|catchment|basin"}
REG = [("mumbai", "Mumbai", "south-asia"), ("bay of bengal", "Bay of Bengal", "south-asia"), ("bangladesh|ganges|brahmaputra", "Ganges–Brahmaputra delta", "south-asia"),
       ("monsoon", "Indian monsoon belt", "south-asia"), ("india", "India", "south-asia"), ("china|kunming|yangtze|pearl river", "China", "east-asia"),
       ("gulf of mexico", "Gulf of Mexico", "north-america"), ("canada|canadian", "Canada", "north-america"), ("united states|u\\.s\\.|florida|california|missouri", "United States", "north-america"),
       ("europe|austria|spain|mediterranean|italy|germany", "Europe", "europe"), ("africa|egypt", "Africa", "africa"), ("arctic|permafrost", "Arctic", "polar"),
       ("global|worldwide", "Global", "global")]

def abstract(inv):
    if not inv: return None
    pos = [(i, w) for w, ix in inv.items() for i in ix]
    text = " ".join(w for _, w in sorted(pos))
    return re.sub(r"^(abstract|summary)[.:]?\s+", "", text, flags=re.I)

def tag(text):
    t = text.lower()
    tp = [k for k, rx in KW.items() if re.search(rx, t)][:5] or [13]
    rg = []
    for rx, name, parent in REG:
        if re.search(rx, t) and name not in [r["name"] for r in rg]: rg.append({"name": name, "parent": parent})
    return tp, rg[:2]

def from_oa(w):
    src = (w.get("primary_location") or {}).get("source") or {}
    name = src.get("display_name", "")
    jn = next((k for k in ABBR if nk(k) == nk(name)), name)
    ab = abstract(w.get("abstract_inverted_index"))
    tp, rg = tag((w["title"] or "") + " " + (ab or ""))
    oa = w.get("open_access") or {}
    lic = ((w.get("best_oa_location") or {}).get("license")) or None
    return {"id": w["id"].rsplit("/", 1)[-1], "doi": (w["doi"] or "").replace("https://doi.org/", "").lower() or None, "title": w["title"],
            "date": w["publication_date"], "journal": {"name": jn, "abbr": ABBR.get(jn, jn), "group": GROUP.get(nk(jn), "Other"), "preprint": False},
            "authors": [a["author"]["display_name"] for a in w["authorships"]], "abstract": ab,
            "oa": bool(oa.get("is_oa")), "licence": lic, "cited": w.get("cited_by_count", 0), "refs": w.get("referenced_works_count", 0),
            "topics": tp, "regions": rg, "retracted": False, "fixture": False}

def coastal_score(p):
    t = (p["title"] + " " + (p["abstract"] or "")).lower()
    return sum(bool(re.search(KW[k], t)) for k in (1, 2, 3, 5, 9, 13))

papers = sorted((from_oa(w) for w in raw), key=lambda p: -coastal_score(p))[:15]
big = [from_oa(w) for w in raw if len(w["authorships"]) >= 50][:1]
noabs = [from_oa(w) for w in extra["noabs"] if w["title"] and len(w["authorships"]) > 0][:2]
longt = [from_oa(extra["pool"][0])]
e = es[0]; pre = {"id": e["DOI"], "doi": e["DOI"], "title": e["title"][0], "date": "-".join(f"{x:02d}" for x in e["posted"]["date-parts"][0]),
                  "journal": {"name": "ESS Open Archive", "abbr": "ESSOAr", "group": "Preprints", "preprint": True},
                  "authors": [" ".join(filter(None, [a.get("given"), a.get("family")])) for a in e.get("author", [])],
                  "abstract": re.sub(r"<[^>]+>", "", e.get("abstract", "")).strip() or None, "oa": True, "licence": None, "cited": 0, "refs": 0,
                  "topics": [], "regions": [], "retracted": False, "fixture": False}
pre["topics"], pre["regions"] = tag(pre["title"] + " " + (pre["abstract"] or ""))
seen, out = set(), []
for p in papers + big + noabs + longt + [pre]:
    if p["id"] not in seen: seen.add(p["id"]); out.append(p)
out = out[:20]
# worst-case fixtures (never presented as real; toggled on in the prototype's "Worst case" switch)
base = dict(out[0])
out.append({**base, "id": "fixture-long-title", "fixture": True,
            "title": "A multi-decadal, multi-sensor reconstruction of compound coastal and fluvial flood extents, depths and durations across the Ganges–Brahmaputra–Meghna delta using synthetic aperture radar, optical imagery, tide-gauge records and a physically constrained machine-learning ensemble"})
out.append({**base, "id": "fixture-non-latin", "fixture": True, "authors": ["李明华", "Ravi Shankar Prasad", "प्रिया देशमुख", "Ngô Thị Hồng", "Ólafur Þórsson", "مریم احمدی"] + [f"Author {i}" for i in range(7, 34)]})
out.append({**base, "id": "fixture-sici", "fixture": True,
            # SICI-style DOIs are real (Wiley legacy): angle brackets, semicolons, no break points
            "doi": "10.1002/(sici)1099-1085(199910)13:14/15<2343::aid-hyp904>3.0.co;2-l",
            "title": "Floods", "authors": ["Aleksandra Wiśniewska-Kowalczyk"], "abstract": None,
            "journal": {"name": "International Journal of Applied Earth Observation and Geoinformation", "abbr": "International Journal of Applied Earth Observation and Geoinformation", "group": "Elsevier", "preprint": False},
            "cited": 12483, "refs": 1, "topics": list(range(1, 14)), "regions": [{"name": "Ganges–Brahmaputra delta", "parent": "south-asia"}], "retracted": True, "oa": False})
for i, p in enumerate(out): p["new"] = i < 6           # first six = new since last visit
pool = [from_oa(w) for w in raw + extra["pool"] if w.get("title")]
counts = {}
for q in pool:
    for r in q["regions"]: counts[r["name"]] = counts.get(r["name"], 0) + 1
parent_counts = {}
for q in pool:
    for par in {r["parent"] for r in q["regions"]}: parent_counts[par] = parent_counts.get(par, 0) + 1
json.dump({"region_counts_sample": counts, "region_parent_counts_sample": parent_counts, "sample_size": len(pool), "generated": "2026-10-21", "source": "OpenAlex (CC0) + Crossref", "topics": topics, "papers": out}, open(OUT, "w"), ensure_ascii=False, indent=1)
real = [p for p in out if not p["fixture"]]
print(len(real), "real +", len(out) - len(real), "fixtures")
print("max title words", max(len(p["title"].split()) for p in real), "| max authors", max(len(p["authors"]) for p in real),
      "| no abstract", sum(p["abstract"] is None for p in real), "| longest doi", max(len(p["doi"] or "") for p in real),
      "| preprints", sum(p["journal"]["preprint"] for p in real), "| regions", sorted({r["name"] for p in out for r in p["regions"]}))
