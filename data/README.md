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
| `profiles/*.json` | Selected public-record profiles with per-paragraph source ids, locators, source types and review dates | `/research/<id>/`, `/data/profiles.json` and `/data/profiles/<id>.json` |

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

### Commentary and research questions

`commentary/mental-health-uk.json` adapts the author's September 2026 first-principles note, with its evidence frame, ten dated scale figures, alternative explanations and explicit unknowns preserved. The cited releases were checked on 17 October 2026; this is not a latest-release dashboard. `scripts/commentary.mjs` validates citations and renders the article separately from profiles and historical dossiers. Exports retain the source-number map and null values (unknown, not zero).

The supplied artwork in `public/images/mental-health-uk/` is reproduced unchanged. Keep its satire and non-NHS-affiliation labels immediately alongside it, including in accessible text. Do not turn the headline into a clinical claim, anecdotes into a prevalence estimate, a benefit entitlement into evidence of misconduct, or institutional headcounts into the cost of administering PIP. The NHS mark is not ours and does not imply endorsement.

### Public-record profiles

The same sourced-page format supports `category: "legal-study"` for super-injunctions, anonymity orders (PPT) and jigsaw identification (Craig Murray). These have distinct legal-study tiles and a research-library section, but remain in the profiles JSON dataset. `related` connects maintained pages; `featured_source` highlights the Guardian report. Citations are numbered by first use and external source links open in new tabs. Keep PPT anonymous; do not reproduce identifying clues from the Murray publications. The 2022 appeal expressly rejects a strict-liability description. Analysis is labelled separately from court findings; the PPT merits are not decided in the cited October anonymity judgment.

Profiles are separate from the six historical imports and from any judges database. `scripts/profiles.mjs` validates their source ids, dates and anchors, then renders escaped plain text with citations. Only research-method and coverage-limit paragraphs may omit sources. Each factual paragraph references the source register, optionally with a paragraph/page locator. Public JSON resolves sources inline and the full-text export preserves attribution and limitations. Do not describe a profile as a full criminal record, conflate a party with a contextual mention, or infer present custody from sentence length. Distinguish judgments, sentencing remarks, reporting, campaign accounts and self-description. The Roger Hallam profile also records corrections to the supplied notes rather than copying co-defendants’ records onto his.

### Barclays5 research migration

Independent Tribunal maintains all six dossiers. Their July 2026 origin and original commit identifier (`9831cfdcb6ca0f63f488cd81794f8e6d0e79f88c`) remain recorded as historical metadata, not links or dependencies on the former repository. The material was migrated on 17 October 2026. Migration is **not** a new fact-check. Keep `source_as_of`, `verification`, `review_note`, original publisher labels and corrections visible in every output. Do not change `migrated_on` to imply a claim was checked.

The original narrative and annotated sources are retained as constrained HTML in `body_html`, with an explicit commentary label. `scripts/research.mjs` validates and renders them. No scripts, event handlers or inline styles are allowed in the imported body. Keep `links` in sync when editing; tests check that every original external citation remains represented. The brochure’s text is in `research/materials/barclays5-brochure.html`, included by default in the Barclays5 page and JSON as dated `supplementary` commentary. Its superseded predictions are explicitly labelled, with the sourced ruling displayed first. Source-data and edit-history links point only to this repository. The old repository, deployment configuration, branding and Git history are not required to build or use the site.

For current-status updates, obtain the primary records and record exactly what was verified and when. Add an `updates` item with a stable `id`, event `date` and `date_label`, `checked` date, `title`, `summary`, `paragraphs`, and attributed `sources` (title, publisher, type, date, checked, URL). Updates render above the historical dossier and appear in JSON and agent-facing text. They do not remove the historical-import warning or imply that the rest of the dossier has been verified. `related_updates` lists dossier ids whose update should also be signposted above a related page. Keep the dossier summary current so homepage tiles and the research index do not repeat superseded claims. Individual corrections can be recorded in `corrections` without implying that all other assertions were verified.

Read [the editorial standards](policies/editorial-standards.md) and [the terrorism and proscribed organisations policy](policies/terrorism-and-proscribed-organisations.md) before adding anything about proscribed organisations.
