# Data sources: rules, limits, measured volumes

All checks done **2026-10-21** (IST) unless noted. "Verified" means checked against the vendor's own docs or a live call. Third-party claims are marked as such.
Never called from the browser: OpenAlex, Crossref, Semantic Scholar, GitHub (server-side keys and budgets).

## Summary table

| source | use | access | limits (verified) | licence / terms | checked |
| --- | --- | --- | --- | --- | --- |
| **OpenAlex** | primary paper metadata, citations, references, cited-by, authors | free key, mandatory for real use (keyless = $0.10/day shared per IP) | free key: **$1/day**, resets 00:00 UTC. List/filter **$0.0001**, search **$0.001**, singleton by ID/DOI/ISSN **free**, content download $0.01. 30 req/s with key. `per_page` max **100**. Cursor paging needs a key. | CC0 metadata | live headers + help.openalex.org (page updated 2026-10-15) |
| **Crossref REST** | DOIs by ISSN/date, update-to (retractions/corrections), licence, relations, ESSOAr preprints | free, polite pool via `mailto` param + identifying User-Agent | public 5 rps single / 1 rps list, concurrency 1. **Polite 10 rps single / 3 rps list, concurrency 3.** Rows ≤1000. | metadata facts; abstracts are publisher copyright | crossref.org docs (page dated 2025-10-16) + live calls |
| **Unpaywall** | best OA URL, OA licence per DOI | free, `?email=` required | ask: ≤100,000 calls/day; snapshot for bulk | CC0 data | unpaywall.org/api/v2 (no 2026 change found). OpenAlex `open_access` covers most needs, so Unpaywall is a fallback only |
| **Semantic Scholar** | optional: recommendations, SPECTER2 | free key by email | keyed: **1 rps** introductory; unauthenticated shared 1000 rps total | API licence: limited, non-sublicensable, no repackaging or redistribution of the API; attribution "Semantic Scholar" required; data under per-dataset licences (some **CC BY-NC**). **Commercial use not clearly granted.** | semanticscholar.org/product/api + /license (dated 2023-05-17) |
| **arXiv API** | preprints (physics.ao-ph, physics.geo-ph, + cross-lists gated by keywords) | free | **1 request / 3 s, one connection**, across all machines | metadata **CC0**; link to abstract page; don't imply endorsement; don't serve PDFs | info.arxiv.org/help/api/tou.html; live: ao-ph 8,846 total, geo-ph 9,074 total |
| **ESS Open Archive** | preprints | Crossref, prefix **10.22541** (Authorea), DOIs `10.22541/essoar.*`, type posted-content | Crossref polite limits | metadata via Crossref | live: about 60% of Authorea posted-content is essoar, about 5.5k/yr |
| **EarthArXiv** | preprints | **OAI-PMH** `https://eartharxiv.org/api/oai/` (Janeway, CDL) | be polite (1 rps) | check per-record licence (mostly CC BY) | live Identify 200. OpenAlex coverage is thin (384 works total), so use OAI directly |
| **SSRN** | preprints | OpenAlex source S4210172589 with a strict domain search filter (no public SSRN API) | OpenAlex search pricing | Elsevier-owned; metadata only, link out | live: 215k/yr total, **3,953/yr** pass the strict gate |
| **News RSS** | News tab | public feeds | fetch hourly, conditional GET (ETag / If-Modified-Since) | store title + snippet + link + date only; always link out | all live 2026-10-21, see below |
| **GDACS** | Lab flood-alert map (v2) | `https://www.gdacs.org/xml/rss.xml` (+ GeoJSON API) | be polite | attribution to GDACS / JRC | live 200 |
| **NOAA CO-OPS** | Lab tide-gauge viewer (v2) | `api.tidesandcurrents.noaa.gov/api/prod/datagetter` + `application=` param | per-request range limits per product | US public domain; attribute NOAA | live 200 (The Battery) |
| **PSMSL** | Lab global gauges (v2) | static RLR files `psmsl.org/data/obtaining/...` | cache; no hammering | attribution and citation required per PSMSL data policy | live 200 |
| **GitHub REST/GraphQL** | Tools Hub (v1.5) | token or GitHub App | unauth 60/h core, 10/min search; token 5,000/h; search 30/min | repo licences vary; we write our own descriptions | live /rate_limit |
| **ecosyste.ms** | Tools Hub metadata (v1.5) | `repos.ecosyste.ms/api/v1` + polite pool via `mailto` / UA / `from` | anonymous tier header: 5,000 limit (window not documented); paid tiers planned | CC BY-SA for some datasets (check per endpoint) | live headers + docs.ecosyste.ms |
| **Zenodo** | software/dataset DOIs (v1.5) | `zenodo.org/api/records` | documented per-IP limits (re-check at v1.5) | record licences vary | live 200 |
| **PyPI / conda-forge** | package metadata (v1.5) | `pypi.org/pypi/<pkg>/json`, anaconda.org API | — | — | live 200 (PyPI) |
| **CSDMS** | model metadata (v1.5) | wiki pages (no API found) | read politely, cache; seed by hand if needed | check site terms at v1.5 | live 200 |
| **Google Flood Forecasting** | Lab panel (v2, flag OFF) | waitlist + GCP key | — | data **CC BY 4.0**, BUT research pages say the pilot is "strictly limited for non-commercial use". **That conflicts with a Premium tier.** Keep it off, or only on free pages, after written confirmation from Google | developers.google.com/flood-forecasting (updated Mar 2026), sites.research.google |

### News feeds (all verified live 2026-10-21)

| outlet | feed URL | items | relevance filter |
| --- | --- | --- | --- |
| Eos | https://eos.org/feed | 15 | none (domain outlet) |
| Hakai Magazine | https://hakaimagazine.com/feed/ | 20 | none |
| NOAA | https://www.noaa.gov/rss.xml | 10 | light keyword filter |
| NASA Earth Observatory | https://earthobservatory.nasa.gov/feeds/earth-observatory.rss | 10 | none (science.nasa.gov/earth/feed has no usable feed) |
| Carbon Brief | https://www.carbonbrief.org/feed/ | 12 | keyword filter (water, coast, flood, sea level, hazards) |
| Nature (news only) | https://www.nature.com/nature.rss | 76 | keep only `/articles/d41586-*` (news), then keyword filter |
| Science News | https://www.sciencenews.org/topic/earth/feed | 20 | keyword filter |

## Measured volumes (OpenAlex, live, 12 months 2025-10-01 → 2026-09-30)

- 127 journals, all resolved to OpenAlex source IDs. ISSNs come from Crossref exact-title matches. Two fixes: NHESS (Crossref record had no ISSN, confirmed in OpenAlex) and Hydrology Research (Crossref's publisher field says Elsevier; the publisher is IWA). JGR: Atmospheres' legacy all-JGR ISSN 0148-0227 is removed. Seed: `data/journals.json`.
- **132,558 papers/yr ≈ 363/day** across the journals.
- Megajournals dominate: Scientific Reports 52,364 (40%), Nat. Commun. 14,103, PNAS 4,884, Ocean Eng. 4,806, Nature 4,394, Sci. Adv. 3,505.
- **Coarse keyword gate** (title + abstract) keeps **24,532/yr (18.5%)**: Sci. Rep. 6.5%, Nat. Commun. 5.1%, Ocean Eng. 35%.
- The reference app's feed shows about 216 papers / 30 days (about 2.6k/yr), so its classifier is far stricter than the coarse gate. Our classifier will land somewhere between the two.
- Preprints after the strict gate: arXiv about 700/yr, SSRN about 4,000/yr, ESSOAr about 5.5k/yr ungated (about 1.5k est. gated), EarthArXiv tens.
- Our counts per journal match the reference app's 30-day counts (Sci. Rep. 4003 vs our 52,364/12 = 4,364; Ocean Eng. 508 vs 400). This confirms it ingests everything per journal.

## Ingestion design implied by these numbers

1. **Fetch everything per journal from OpenAlex with list calls, then classify in our worker.** Don't use OpenAlex `search` filters to pre-filter journals. A search page costs **10×** a list page, and our own classifier has to see every paper anyway (recall, editable keywords, reclassification).
2. Store full rows only for papers our classifier tags (≥1 topic). Every fetched work gets a slim `paper_ledger` row (openalex_id, doi, journal_id, pub_date, first_seen_at) for dedupe, journal counts and re-classification.
3. Preprints: arXiv API (free) for physics.ao-ph / physics.geo-ph, plus keyword-gated cross-lists. ESSOAr via Crossref. EarthArXiv via OAI-PMH. SSRN via 1 OpenAlex strict-search call/day. Then enrich every candidate with a free OpenAlex singleton lookup by DOI.
4. Semantic Scholar **is not on the v1 critical path**. References and Cited by come from OpenAlex (CC0). "Similar" comes from our own embeddings. Revisit S2 after a licence reply.

## Expected OpenAlex spend (free key, $1.00/day budget)

| job | cadence | calls/day | $/day |
| --- | --- | --- | --- |
| journal ingest (3 OR-batches of ≤50 source IDs × 8 runs + about 4 extra pages of new works) | every 3 h | about 30 list | **$0.003** |
| SSRN strict search | daily | 1 search | $0.001 |
| DOI enrichment of preprints (singleton) | per candidate | about 30 | $0.000 (free) |
| citation refresh, stored papers < 2 yr (OR filter 100 IDs/call) | daily | 160–600 list | $0.016–0.060 |
| citation refresh, older papers | weekly (÷7) | 60–200 list | $0.006–0.020 |
| new works by followed authors (OR 100 author IDs/call) | daily | 10–100 list | $0.001–0.010 |
| on-demand References / Cited by (2 list calls per uncached paper, 7-day cache) | user-driven | 200–2,000 | $0.02–0.20 |
| **steady state total** | | | **≈ $0.05/day at launch, ≈ $0.10–0.30/day at 10k users** |
| one-off backfill (5 yrs × 133k = 665k works ÷ 100/page) | once, over 2 days | 6,650 list | $0.67 total |

Guardrails: read `X-RateLimit-Remaining-USD` / `X-RateLimit-Cost-USD` on every response and log them to `job_runs.spend_usd`. A soft alert at $0.50/day goes to the admin page and email. **A hard stop at $0.80/day** pauses non-critical jobs (on-demand connections serve the cache, marked "may be stale"). Ingest always runs first after 00:00 UTC.

## Copyright rules (applied in code)

- Show an abstract only when the metadata source provides one. Truncate on cards, and always show the source + DOI link.
- The OpenAlex abstract arrives as an inverted index. Rebuild it server-side.
- AI full-text summaries are allowed only for OA works with a licence that permits it (CC BY / CC BY-SA / CC0). Otherwise abstract-only, and the output says so.
- News: title + snippet + link + date only.
- A takedown contact and process goes on the methodology page.

## Keys Ali needs to create (later, when each stage needs them)

| key | where | stage |
| --- | --- | --- |
| `OPENALEX_API_KEY` | openalex.org/settings/api (free, with your email) | build (v1) |
| `CROSSREF_MAILTO` | just your email, no account | build (v1) |
| `SEMANTIC_SCHOLAR_API_KEY` | optional; semanticscholar.org/product/api "Request an API key" | later |
| GitHub token | github.com → Settings → Developer settings → fine-grained token (public repos, read-only) | v1.5 |
