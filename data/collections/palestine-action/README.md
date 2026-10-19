# Palestine Action research collection

The two supplied files are preserved byte-for-byte in `imports/`. The supplement
is stored as `.txt` because its citation markers outside strings make it invalid
JSON. `scripts/palestine-action.mjs` removes only the `[cite: …]` markers to parse
it. These markers are not verified references. Original marker locations remain
available in the source download. Keys claiming verification are renamed to
`reported_…` in the derived dataset. Original inputs are never edited.

The public schema v2 has one `cases` array containing all 52 records, ordered by
earliest action date and then stable ID. These include related/unaffiliated actions
and bounded series, not 52 convictions or necessarily 52 distinct proceedings.
Five enrichments are attached as `reported_details` to their matching records.
Seven lobbying accounts are attached to `elbit-lobbying-foi`. There is no separate
supplementary case array. Per-record `provenance` retains input filenames and
the original, unaudited source counts. The public page foregrounds the history
before 7 October 2023 and distinguishes action dates from trial dates.

`corrections.json` holds targeted editorial replacements, reasons and supporting
sources. The loader validates record IDs, applies replacements only to the unified
output, appends review sources, and exposes review scope and date on each affected
record. Existing record IDs are retained so public deep links keep working. This
does not verify untouched fields or erase unresolved conflicts. The downloadable
schema includes the correction log; raw downloads remain archival, not canonical.

The supplied CAGE International PDF is preserved unchanged at
`public/publications/Cage-NGO-Putting-Bodies-On-The-Line.pdf`. The cover PNG is a
render of its first page. This third-party publication retains its own rights and
is not relicensed under the site's licence. The report is advocacy, not a judgment.

The hub's legal-status note was checked against GOV.UK and the Judiciary's
15 June 2026 appeal summary on 19 October 2026. This is not a review of every
imported claim. Arrest totals with inconsistent subtotals are flagged, not fixed
by guessing. Allegations of interference and causal claims about business
decisions require the underlying records; source repetition is not corroboration.
