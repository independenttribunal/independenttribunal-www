# /data — the source of truth

Everything in the Legal affairs hub starts here. Edit these files (by hand or with an AI agent), push to `main`, and GitHub Actions rebuilds the site.

`scripts/build-data.mjs` validates this folder and generates the public pages and JSON. A bad reference id, a missing field or a malformed date fails the build, so mistakes don't reach the live site. Run it locally with `npm run data`.

| File | What it holds | Published as |
|---|---|---|
| `site.json` | Name, URL, licence, contact routes | Used everywhere |
| `references.json` | Primary and official sources: legislation, judgments, official publications | `/data/references.json` |
| `timelines/*.json` | Timelines; each entry cites references by `id` | `/data/timelines/<id>.json` (sources resolved inline) and the timeline page |
| `policies/*.md` | Policies, Markdown with front matter | `/legal/<slug>/` (HTML) and `/legal/<slug>.md` |
| `research/*.json` | Dated imported dossiers, annotations, links, corrections and immutable provenance | `/research/<id>/`, `/data/research.json` and `/data/research/<id>.json` |
| `research-migration.json` | Original citation inventory from the Barclays5 source repository | Used by migration-integrity tests |

Generated for agents: `/llms.txt`, `/llms-full.txt`, `/data/index.json`, `/sitemap.xml`, `/robots.txt`.

## Adding a reference

```json
{
  "id": "short-kebab-id",
  "title": "Official title of the document",
  "publisher": "legislation.gov.uk",
  "date": "2025-07-04",
  "url": "https://…",
  "type": "legislation | judgment | official | report | article | organisation | dataset",
  "jurisdiction": "UK",
  "topics": ["protest"],
  "summary": "One or two neutral sentences on what the document is or decided.",
  "checked": "2026-10-14"
}
```

Prefer the primary record: legislation.gov.uk for statutes, caselaw.nationalarchives.gov.uk or the court for judgments, GOV.UK for government positions. Set `checked` to the day you confirmed the URL opens the named document.

## Adding a timeline entry

Add an object to a section's `entries` and list its references in `sources`. Leave `sources` empty if you have none yet: `/data/index.json` lists unsourced entries under `coverage` so they get fixed rather than forgotten. Entry text supports `*italic*`, `**bold**` and `[links](https://…)`.

Kinds: `statute`, `sentence`, `event`, `pushback`, `ruling`.

## House rules

### Barclays5 research migration

The six dossiers came from `PlanetaryCouncil/barclays5` at commit `9831cfdcb6ca0f63f488cd81794f8e6d0e79f88c`. The source was compiled on 28 July 2026 and migrated on 17 October 2026. Migration is **not** a new fact-check. Keep `source_as_of`, `verification`, `review_note`, original publisher labels and corrections visible in every output. Do not change `migrated_on` to imply a claim was checked.

The original narrative and annotated sources are retained as constrained HTML in `body_html`, with an explicit commentary label. `scripts/research.mjs` validates and renders them. No scripts, event handlers or inline styles are allowed in the imported body. Keep `links` in sync when editing; tests check that every original external citation remains represented. The original brochure and pre-migration text remain accessible through immutable GitHub snapshot links on the dossier pages.

For future current-status updates, obtain the primary records and record exactly what was verified and when. Update the schema and presentation deliberately; do not simply remove the historical-import warning. Individual corrections can be recorded in `corrections` without implying that all other assertions were verified.

Read [the editorial standards](policies/editorial-standards.md) and [the terrorism and proscribed organisations policy](policies/terrorism-and-proscribed-organisations.md) before adding anything about proscribed organisations.
