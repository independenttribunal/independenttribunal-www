import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const palestineActionTile = {
  kind: "collection", id: "palestine-action", title: "Palestine Action",
  label: "UK · Research collection",
  summary: "What is legal? What is normal? What is real? Cases, proscription, institutional accountability and the evidence behind the arguments.",
  tags: ["uk", "palestine-action", "protest", "accountability"],
  href: "/research/palestine-action/", uk: true,
};
const pdf = "/publications/Cage-NGO-Putting-Bodies-On-The-Line.pdf";
const basePath = "/data/collections/palestine-action";
const markers = /\[cite:\s*[\d,\s]+\]/g;
const labels = {
  prosecution: "Prosecutions", action: "Actions and campaigns", public_law: "Proscription litigation",
  civil_disobedience: "Civil disobedience", other_direct_action: "Other direct action",
  public_record: "Public records", direct_action_unaffiliated: "Unaffiliated direct action",
  supply_chain_impact: "Supply-chain claims", policy_contract_impact: "Policy and contracts", artistic_intervention: "Art and public debate",
};
export function normalizeSupplement(raw) {
  // Repair the exact non-JSON annotation syntax, without evaluating supplied text.
  const parsed = JSON.parse(raw.replace(markers, ""));
  const rename = (v) => Array.isArray(v) ? v.map(rename) : v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).map(([k, value]) => [k.replace(/^verified_/, "reported_"), rename(value)])) : v;
  return rename(parsed);
}
export async function loadPalestineAction(dataDir) {
  const dir = join(dataDir, "collections/palestine-action/imports");
  const original = await readFile(join(dir, "cases.json"), "utf8");
  const rawSupplement = await readFile(join(dir, "supplement.txt"), "utf8");
  const base = JSON.parse(original);
  const supplement = normalizeSupplement(rawSupplement);
  if (base.case_count !== base.cases.length) throw new Error("Palestine Action case count mismatch");
  const ids = new Set();
  for (const record of [...base.cases, ...supplement.new_cases]) {
    if (!/^[a-z0-9-]+$/.test(record.id) || ids.has(record.id)) throw new Error("Invalid or duplicate Palestine Action record id");
    ids.add(record.id);
  }
  for (const id of Object.keys(supplement.case_enrichments)) {
    if (!base.cases.some((c) => c.id === id)) throw new Error(`Unmatched enrichment: ${id}`);
  }
  const issues = supplement.case_enrichments["defend-our-juries"].granular_chronology.flatMap((event) => {
    if (!event.geographic_breakdown) return [];
    const sum = Object.values(event.geographic_breakdown).reduce((a, b) => a + b, 0);
    return sum === event.arrests ? [] : [{ date: event.date, reported_total: event.arrests, subtotal_sum: sum, note: "Imported total and geographic subtotals disagree; not reconciled." }];
  });
  return { original, rawSupplement, base, supplement, issues };
}

export async function publishPalestineAction({ collection, records, put, page, escapeHtml: e }) {
  const { base, supplement, issues } = collection;
  const external = (url, label) => /^https:\/\//.test(url ?? "") ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>` : e(label);
  const title = (key) => key.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
  const renderValue = (value) => value === null || value === undefined ? '<span class="pa-muted">Not recorded in supplied data</span>'
    : Array.isArray(value) ? (value.length ? `<ul>${value.map((v) => `<li>${renderValue(v)}</li>`).join("")}</ul>` : '<span class="pa-muted">Not recorded</span>')
    : typeof value === "object" ? `<dl class="pa-fields">${Object.entries(value).map(([k, v]) => `<dt>${e(title(k))}</dt><dd>${renderValue(v)}</dd>`).join("")}</dl>`
    : `<span>${e(value)}</span>`;
  const sourceList = (sources = []) => `<ol class="pa-sources">${sources.map((s) => {
    const dossier = s.kind === "ngo_dossier";
    // Only explicit page labels are linked; unresolved cite markers are never treated as page references.
    const pageNumber = s.title?.match(/\bpp?\.\s*(\d+)/)?.[1];
    const link = dossier ? `<a href="${pdf}${pageNumber ? `#page=${pageNumber}` : ""}" target="_blank" rel="noopener noreferrer">${e(s.title)} ↗</a>` : external(s.url, s.title ?? s.outlet ?? "Source");
    return `<li>${link}<br><span class="pa-muted">${e(s.outlet ?? "Unspecified publisher")} · ${e(s.kind ?? "Source type not specified")} ${s.date ? `· ${e(s.date)}` : ""}</span></li>`;
  }).join("")}</ol>`;
  const caseCard = (c, isSupplement) => {
    const enrichment = supplement.case_enrichments[c.id];
    const fields = Object.fromEntries(Object.entries(c).filter(([k]) => !["id", "nickname", "category", "sources", "source_count", "independent_source_count"].includes(k)));
    return `<details class="pa-record" id="case-${c.id}" data-case data-category="${e(c.category)}" data-origin="${isSupplement ? "supplement" : "base"}">
      <summary><span class="pa-record-label">${e(labels[c.category] ?? title(c.category))} · ${isSupplement ? "Supplement" : "Base dataset"}</span><strong>${e(c.nickname)}</strong><span class="pa-muted">${e((c.action_dates ?? []).join(" · "))}</span></summary>
      <div class="pa-record-body"><p class="pa-caution">Imported account — not independently verified here. Arrests and charges are not convictions. Outcomes and custody statements are dated source claims, not a live status service.</p><p><a href="#case-${c.id}">Link to this record</a></p>
      ${renderValue(fields)}<h3>Sources supplied with this record</h3>${sourceList(c.sources)}
      ${enrichment ? `<h3>Supplementary account</h3><p class="pa-caution">The supplementary file attributes this material to CAGE. Its original “verified” labels are not our verification. Read the report and original extraction before relying on names, dates or outcomes.</p>${renderValue(enrichment)}<p><a href="${pdf}" target="_blank" rel="noopener noreferrer">Consult the CAGE report ↗</a></p>` : ""}</div></details>`;
  };
  const derived = {
    schema: "independent-tribunal/palestine-action-collection/1.0", imported_on: "2026-10-19",
    verification: "imported-claims-not-independently-verified", source_compiled_at: base.compiled_at,
    note: "This is a source index, not a list of convictions or a complete current record. Related unaffiliated actions are included. Supplementary records are separate, not silently merged; possible event overlap is not deduplicated. Original source counts are not an audit of editorial independence.",
    normalization: "Removed unresolved [cite: …] markers from the supplementary file to repair JSON. Renamed verified_* fields to reported_*. Raw source retained. Marker removal does not verify a claim.",
    legal_status_checked: "2026-10-19", legal_status: "Palestine Action is listed as proscribed by the Home Office. The Court of Appeal allowed the Home Secretary's appeal on 15 June 2026.",
    legal_status_sources: ["https://www.gov.uk/government/publications/proscribed-terror-groups-or-organisations--2/proscribed-terrorist-groups-or-organisations-accessible-version", "https://www.judiciary.uk/judgments/home-secretary-v-huda-ammori/"],
    limits: base.limits, quality_issues: issues, cases: base.cases,
    supplementary_cases: supplement.new_cases, case_enrichments: supplement.case_enrichments,
    lobbying_accounts: supplement.judicial_interference_and_lobbying_matrix,
  };
  await put(`${basePath.slice(1)}.json`, derived);
  await put(`${basePath.slice(1)}/original-cases.json`, collection.original);
  await put(`${basePath.slice(1)}/original-supplement.txt`, collection.rawSupplement);
  const related = records.filter((r) => ["barclays5", "filton6", "terrorist-connection", "proscription-litigation", "hunger-strikes"].includes(r.id));
  const all = [...base.cases, ...supplement.new_cases];
  const categories = [...new Set(all.map((c) => c.category))];
  await put("research/palestine-action/index.html", page({
    title: "Palestine Action", path: palestineActionTile.href, description: palestineActionTile.summary,
    meta: '<p class="meta">Collection assembled 19 October 2026 · Base dataset compiled 17 October 2026 · Individual claims require source-level review</p>',
    body: `<link rel="stylesheet" href="/palestine-action.css">
      <div class="kicker"><a href="/research/">Research library</a> / UK collection</div>
      <h1>Palestine Action</h1><p class="pa-deck">What is legal?<br>What is normal?<br><em>What is real?</em></p>
      <p class="lede">Protest, proscription and the question of complicity. A collection for examining the distance between what institutions permit, what society accepts, and what the evidence shows.</p>
      <nav class="pa-jump" aria-label="Collection sections"><a href="#legal-status">Legal status</a><a href="#research">Research</a><a href="#report">The report</a><a href="#cases">Case index</a><a href="#institutions">Institutional scrutiny</a><a href="#method">Data and method</a></nav>
      <aside class="pa-status" id="legal-status"><span class="kicker">Legal status · checked 19 October 2026</span><h2>Read the current position first.</h2><p>Palestine Action remains on the Home Office’s list of proscribed organisations. On 15 June 2026, the Court of Appeal allowed the Home Secretary’s appeal and held the proscription decision lawful, reversing the High Court’s earlier conclusion. The 2025 report below predates those judgments.</p><p>${external(derived.legal_status_sources[0], "Home Office list")} · ${external(derived.legal_status_sources[1], "[2026] EWCA Civ 721")}</p><p class="pa-muted">This collection examines evidence and law; it is not an invitation to support a proscribed organisation. Proscription, an individual criminal charge, and a terrorism-related sentencing finding are separate legal questions.</p></aside>
      <section class="pa-questions" aria-label="Research questions"><article><span>01 / Law</span><h2>What is legal?</h2><p>Which power was used? What must be proved? What did the court actually decide?</p></article><article><span>02 / Institutions</span><h2>What is normal?</h2><p>Which relationships and decisions escape scrutiny? When is an accepted practice still open to challenge?</p></article><article><span>03 / Evidence</span><h2>What is real?</h2><p>Separate a document from an inference, an allegation from a finding, and a moral argument from a legal conclusion.</p></article></section>
      <p class="pa-caution">Editorial starting point: legality does not settle every moral question. Equally, an accusation of complicity is not proof. This collection asks what evidence would establish responsibility—and what evidence would challenge that account.</p>
      <section id="research"><h2>Follow the legal questions</h2><div class="pa-related">${related.map((r) => `<a href="/research/${r.id}/"><span class="pa-record-label">Research dossier</span><strong>${e(r.title)} →</strong><span>${e(r.summary)}</span></a>`).join("")}<a href="/uk-timeline/"><span class="pa-record-label">Wider context</span><strong>UK timeline →</strong><span>Trace the changing legal framework for protest and public order.</span></a></div></section>
      <section id="report" class="pa-report"><a href="${pdf}" target="_blank" rel="noopener noreferrer"><img src="/publications/cage-putting-bodies-cover.png" width="708" height="1000" alt="Cover of CAGE International’s Putting Bodies on the Line report" loading="lazy"></a><div><span class="kicker">Source publication · November 2025</span><h2>Putting Bodies on the Line</h2><p>The Landscape of Direct Action and Civil Disobedience for Palestine in Britain.</p><p>CAGE International · 66 pages · PDF, 6.2 MB</p><p>An advocacy report covering campaigns, criminal proceedings, the Filton cases and allegations about institutional influence. Its arguments belong to its authors; they are not court findings or Independent Tribunal’s verification.</p><p><a class="pa-button" href="${pdf}" target="_blank" rel="noopener noreferrer">Read the full report ↗</a></p><p class="pa-muted">Third-party publication; rights remain with its rights holders. Preserved as supplied.</p></div></section>
      <section id="cases"><h2>Explore the case index</h2><p>${base.cases.length} base records + ${supplement.new_cases.length} supplementary records. These include cases, campaigns and related actions—not ${all.length} convictions or a deduplicated count of proceedings. Unaffiliated actions are identified separately.</p>
      <div class="pa-controls" hidden><label>Search the records<input id="pa-search" type="search" placeholder="Case, court, place or name…"></label><label>Record category<select id="pa-category"><option value="all">All categories</option>${categories.map((c) => `<option value="${e(c)}">${e(labels[c] ?? title(c))}</option>`).join("")}</select></label><button type="button" id="pa-reset">Reset</button></div>
      <p id="pa-count" role="status" aria-live="polite">${all.length} source records</p><p class="pa-caution">Expand a record for the imported account and its sources. Links open in a new tab. The base file contains later reporting; supplementary material reflects the older report. Differences are preserved, not resolved by assumption.</p>
      <div id="pa-records">${base.cases.map((c) => caseCard(c, false)).join("")}${supplement.new_cases.map((c) => caseCard(c, true)).join("")}</div><p id="pa-empty" hidden>No records match. Try another term or reset the filters.</p></section>
      <section id="institutions"><h2>Lobbying and institutional scrutiny</h2><p>Seven accounts imported from the supplementary extraction. These are allegations and attributed descriptions, not findings of judicial interference. A meeting or contact does not, by itself, establish improper influence. The underlying correspondence, complete context and responses are needed to test each account.</p><p><a href="${pdf}#page=38" target="_blank" rel="noopener noreferrer">Read CAGE’s chapter, pages 38–42 ↗</a></p>${supplement.judicial_interference_and_lobbying_matrix.map((item, i) => `<details class="pa-record"><summary><strong>${e(item.date)} · Account ${i + 1}</strong><span class="pa-muted">Supplementary allegation · source review pending</span></summary><div class="pa-record-body">${renderValue(item)}</div></details>`).join("")}</section>
      <section id="method"><h2>Open data. Visible limitations.</h2><p>Both supplied files are retained unchanged. A derived dataset makes the supplement valid JSON and removes unresolved citation tokens; it does not turn those tokens into verified references. Supplementary fields originally labelled “verified” are presented as “reported”. The five enrichments sit alongside their base records.</p><h3>Data-quality flags</h3><ul>${issues.map((i) => `<li>${e(i.date)}: reported arrests ${i.reported_total}; geographic subtotals add to ${i.subtotal_sum}. The discrepancy remains unresolved.</li>`).join("")}<li>Source counts are not an audit of independence: several articles may repeat the same account.</li><li>Corporate decisions do not establish causation by a campaign without further evidence.</li><li>Names, custody status and trial outcomes in imported material have not all been rechecked. No adverse inference should be drawn merely from inclusion.</li></ul><h3>Original compiler’s limits</h3>${renderValue(base.limits)}<ul><li><a href="${basePath}.json" target="_blank" rel="noopener noreferrer">Derived collection JSON ↗</a></li><li><a href="${basePath}/original-cases.json" target="_blank" rel="noopener noreferrer">Original base dataset ↗</a></li><li><a href="${basePath}/original-supplement.txt" target="_blank" rel="noopener noreferrer">Original supplementary file (unrepaired text) ↗</a></li></ul></section>
      <script src="/palestine-action.js" defer></script>`,
  }));
}
