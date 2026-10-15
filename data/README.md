# /data — the source of truth

Everything in the Legal affairs hub starts here. Edit these files (by hand or with an AI agent), push to `main`, and GitHub Actions rebuilds the site.

`scripts/build-data.mjs` validates this folder and generates the public pages and JSON. A bad reference id, a missing field or a malformed date fails the build, so mistakes don't reach the live site. Run it locally with `npm run data`.

| File | What it holds | Published as |
|---|---|---|
| `site.json` | Name, URL, licence, contact routes | Used everywhere |
| `references.json` | Primary and official sources: legislation, judgments, official publications | `/data/references.json` |
| `timelines/*.json` | Timelines; each entry cites references by `id` | `/data/timelines/<id>.json` (sources resolved inline) and the timeline page |
| `policies/*.md` | Policies, Markdown with front matter | `/legal/<slug>/` (HTML) and `/legal/<slug>.md` |

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

Read [the editorial standards](policies/editorial-standards.md) and [the terrorism and proscribed organisations policy](policies/terrorism-and-proscribed-organisations.md) before adding anything about proscribed organisations.
