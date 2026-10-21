# PROJECT_NAME

A free, open research hub for coastal flooding, sea level, subsidence, hydrology and flood GeoAI: new papers and preprints from about 130 journals, tagged by topic and region, with open methods. *(Working name until branding.)*

**Status: early development.** Build steps 0–1 are done: a working feed from real OpenAlex data, a paper sheet, local saves, and an installable PWA shell. Planning documents live in [`replica/`](replica/).

## Run it locally (macOS)

You need Node.js 22+, and Postgres 17 with pgvector (`brew install postgresql@17 pgvector`).

```bash
npm install
cp .env.example .env.local      # then fill in OPENALEX_API_KEY (free) and CONTACT_EMAIL
npm run db:local                # local Postgres on port 55433 + schema + reference data
npm run ingest:papers           # fetch recent papers from the 5 starter journals
npm run build && npm start      # http://localhost:3000
```

Tests: `npm test` (unit + integration), then `npx playwright test` against a running production build on port 3100.

## Licence

- **App code:** [GNU AGPL-3.0](LICENSE). If you run a modified version as a service, you must publish your changes.
- **Data seeds** (`data/journals.json`, `data/topics.json`, `data/regions.json`, `data/keywords.seed.json`): [CC0-1.0](data/LICENSE-CC0.txt).
- **Paper metadata** comes from open scholarly sources (OpenAlex CC0, Crossref, arXiv CC0 metadata), with attribution in the app.
