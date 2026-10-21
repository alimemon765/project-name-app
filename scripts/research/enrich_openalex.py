"""Attach OpenAlex source IDs / OA flags to data/journals.json (free singleton lookups),
then measure 12-month paper volume per source with grouped list calls."""
import json, sys, time, urllib.request, urllib.parse
M = sys.argv[1]
FROM, TO = "2025-10-01", "2026-09-30"
OR_LIMIT = 50  # stay well under OpenAlex's OR-value limit

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": f"coastal-hub-research (mailto:{M})"}), timeout=60) as r:
        return json.load(r), r.headers.get("x-ratelimit-cost-usd")

rows = json.load(open("data/journals.json"))
fix = {"Natural Hazards and Earth System Sciences": ["1561-8633", "1684-9981"]}
spend = 0.0
for o in rows:
    if o["name"] in fix:
        o["issns"] = fix[o["name"]]; o["verified_via"] = "openalex source by issn"; o["verified"] = True
    if o["name"] == "Journal of Geophysical Research: Atmospheres":
        o["issns"] = [i for i in o["issns"] if i != "0148-0227"]
    if o["name"] == "Hydrology Research":
        o["publisher"] = "IWA Publishing"; o["verified_via"] = "crossref title + openalex issn (crossref publisher field wrong)"
    o["issns"] = list(dict.fromkeys(o["issns"]))
    src = None
    for issn in o["issns"]:
        try:
            src, _ = get(f"https://api.openalex.org/sources/issn:{issn}?select=id,display_name,issn_l,is_oa,host_organization_name")
            break
        except Exception:
            continue
    o["openalex_id"] = src and src["id"].rsplit("/", 1)[-1]
    o["issn_l"] = src and src["issn_l"]
    o["is_oa"] = bool(src and src["is_oa"])
    if not src: o["verified"] = False
    time.sleep(0.1)

ids = [o["openalex_id"] for o in rows if o["openalex_id"]]
counts = {}
for i in range(0, len(ids), OR_LIMIT):
    f = f"primary_location.source.id:{'|'.join(ids[i:i+OR_LIMIT])},from_publication_date:{FROM},to_publication_date:{TO}"
    d, cost = get("https://api.openalex.org/works?" + urllib.parse.urlencode({"filter": f, "group_by": "primary_location.source.id", "per_page": 200}))
    spend += float(cost or 0)
    for g in d["group_by"]:
        counts[g["key"].rsplit("/", 1)[-1]] = g["count"]
for o in rows:
    o["papers_12mo"] = counts.get(o["openalex_id"], 0)
json.dump(rows, open("data/journals.json", "w"), indent=1, ensure_ascii=False)
tot = sum(o["papers_12mo"] for o in rows)
print(f"missing openalex: {[o['name'] for o in rows if not o['openalex_id']]}")
print(f"total 12-mo papers: {tot}  (~{tot/365:.0f}/day)  spend ${spend:.4f}")
for o in sorted(rows, key=lambda x: -x["papers_12mo"])[:12]:
    print(f"  {o['papers_12mo']:6}  {o['name']}")
print("OA journals:", sum(o["is_oa"] for o in rows))
