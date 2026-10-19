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
  const corrections = JSON.parse(await readFile(join(dataDir, "collections/palestine-action/corrections.json"), "utf8"));
  for (const id of Object.keys(corrections.records)) {
    if (!ids.has(id)) throw new Error(`Unmatched correction: ${id}`);
  }
  const cases = [...base.cases, ...supplement.new_cases].map((input) => {
    const record = structuredClone(input);
    const enrichment = supplement.case_enrichments[record.id];
    record.provenance = {
      inputs: [base.cases.includes(input) ? "original-cases.json" : "original-supplement.txt"],
      imported_source_counts: { total: record.source_count ?? null, independent: record.independent_source_count ?? null },
    };
    delete record.source_count;
    delete record.independent_source_count;
    if (enrichment) {
      record.reported_details = structuredClone(enrichment);
      record.provenance.inputs.push("original-supplement.txt");
      record.provenance.reported_details = "CAGE-attributed extraction; original verified_* labels changed to reported_*; not independently verified.";
    }
    if (record.id === "elbit-lobbying-foi") {
      record.lobbying_accounts = structuredClone(supplement.judicial_interference_and_lobbying_matrix);
      record.provenance.inputs.push("original-supplement.txt");
      record.account_status = "CAGE-attributed allegations and descriptions, not findings of judicial interference. Source review pending. A meeting alone does not prove improper influence.";
    }
    const correction = corrections.records[record.id];
    if (correction) {
      Object.assign(record, structuredClone(correction.replace));
      record.sources = [...(record.sources ?? []), ...correction.sources];
      record.editorial_review = { date: corrections.reviewed_on, note: correction.note, scope: corrections.scope, corrected_fields: Object.keys(correction.replace), sources: correction.sources };
    }
    record.provenance.inputs = [...new Set(record.provenance.inputs)];
    return record;
  }).sort((a, b) => {
    const firstDate = (c) => [...(c.action_dates ?? [])].sort()[0] ?? "9999";
    return firstDate(a).localeCompare(firstDate(b)) || a.id.localeCompare(b.id);
  });
  return { original, rawSupplement, base, supplement, issues, cases, corrections };
}

export async function publishPalestineAction({ collection, records, put, page, escapeHtml: e }) {
  const { base, cases, issues } = collection;
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
  const caseCard = (c) => {
    const fields = Object.fromEntries(Object.entries(c).filter(([k]) => !["id", "nickname", "category", "sources", "provenance", "editorial_review", "reported_details"].includes(k)));
    return `<details class="pa-record" id="case-${c.id}" data-case data-category="${e(c.category)}">
      <summary><span class="pa-record-label">${e(labels[c.category] ?? title(c.category))}</span><strong>${e(c.nickname)}</strong><span class="pa-muted">${e((c.action_dates ?? []).join(" · "))}</span></summary>
      <div class="pa-record-body"><p class="pa-caution">Dated source account. Arrests and charges are not convictions; custody and outcomes are not live status reports.</p><p><a href="#case-${c.id}">Link to this record</a></p>
      ${c.editorial_review ? `<aside class="pa-caution"><strong>Correction · ${e(c.editorial_review.date)}</strong><p>${e(c.editorial_review.note)}</p><p>${e(c.editorial_review.scope)}</p>${sourceList(c.editorial_review.sources)}</aside>` : ""}
      ${renderValue(fields)}${c.reported_details ? `<h3>Reported detail</h3><p class="pa-muted">Additional detail attributed to CAGE; not independently verified. Differences from later reporting remain visible.</p>${renderValue(c.reported_details)}` : ""}<h3>Sources</h3>${sourceList(c.sources)}
      <details><summary>Source provenance</summary>${renderValue(c.provenance)}<p>Imported source counts are the compiler’s figures, not an audit of independence.</p></details></div></details>`;
  };
  const derived = {
    schema: "independent-tribunal/palestine-action-collection/2.0", imported_on: "2026-10-19",
    verification: "source-accounts-with-targeted-editorial-corrections", source_compiled_at: base.compiled_at,
    note: "One chronological collection combining both inputs, with additional details attached to their matching records and record-level provenance. This is a source index, not a list of convictions, a deduplicated event count or an exhaustive live record. Related unaffiliated actions are labelled separately. Only explicitly identified fields received targeted editorial review.",
    normalization: "Removed unresolved [cite: …] markers from the supplementary file to repair JSON. Renamed verified_* fields to reported_*. Raw source retained. Marker removal does not verify a claim.",
    legal_status_checked: "2026-10-19", legal_status: "Palestine Action is listed as proscribed by the Home Office. The Court of Appeal allowed the Home Secretary's appeal on 15 June 2026.",
    legal_status_sources: ["https://www.gov.uk/government/publications/proscribed-terror-groups-or-organisations--2/proscribed-terrorist-groups-or-organisations-accessible-version", "https://www.judiciary.uk/judgments/home-secretary-v-huda-ammori/"],
    historical_scope: "The collection includes actions from 2020, before 7 October 2023. Action dates are not necessarily trial or judgment dates.",
    limits: base.limits, quality_issues: issues, cases,
    corrections: collection.corrections,
  };
  await put(`${basePath.slice(1)}.json`, derived);
  await put(`${basePath.slice(1)}/original-cases.json`, collection.original);
  await put(`${basePath.slice(1)}/original-supplement.txt`, collection.rawSupplement);
  const related = records.filter((r) => ["barclays5", "filton6", "terrorist-connection", "proscription-litigation", "hunger-strikes"].includes(r.id));
  const categories = [...new Set(cases.map((c) => c.category))];
  await put("research/palestine-action/index.html", page({
    title: "Palestine Action", path: palestineActionTile.href, description: palestineActionTile.summary,
    meta: '<p class="meta">Updated 19 October 2026 · One collection, with dated sources and a visible correction record</p>',
    body: `<link rel="stylesheet" href="/palestine-action.css">
      <div class="kicker"><a href="/research/">Research library</a> / UK collection</div>
      <h1>Palestine Action</h1><p class="pa-deck">What is legal?<br>What is normal?<br><em>What is real?</em></p>
      <p class="lede">Protest, proscription and the question of complicity. A collection for examining the distance between what institutions permit, what society accepts, and what the evidence shows.</p>
      <nav class="pa-jump" aria-label="Collection sections"><a href="#history">Before October 2023</a><a href="#legal-status">Legal status</a><a href="#research">Research</a><a href="#report">The report</a><a href="#cases">Case index</a><a href="#institutions">Institutional scrutiny</a><a href="#method">Data and method</a></nav>
      <section id="history"><span class="kicker">The longer history</span><h2>This began before 7 October 2023.</h2><p>Palestine Action’s activity did not begin with the war that followed 7 October 2023. This collection traces actions from 2020, alongside later prosecutions, campaigns and legal changes. An action’s date is not necessarily the date of its trial or judgment.</p><div class="pa-related"><a href="#case-elbit-eight"><span class="pa-record-label">2020 onward</span><strong>Elbit Eight →</strong><span>Early actions and the later proceedings.</span></a><a href="#case-oldham-ferranti-campaign"><span class="pa-record-label">2021</span><strong>Oldham / Ferranti →</strong><span>The earlier factory campaign.</span></a><a href="#case-thales-five"><span class="pa-record-label">2022</span><strong>Thales Five →</strong><span>An action predating October 2023.</span></a></div></section>
      <aside class="pa-status" id="legal-status"><span class="kicker">Legal status · checked 19 October 2026</span><h2>Read the current position first.</h2><p>Palestine Action remains on the Home Office’s list of proscribed organisations. On 15 June 2026, the Court of Appeal allowed the Home Secretary’s appeal and held the proscription decision lawful, reversing the High Court’s earlier conclusion. The 2025 report below predates those judgments.</p><p>${external(derived.legal_status_sources[0], "Home Office list")} · ${external(derived.legal_status_sources[1], "[2026] EWCA Civ 721")}</p><p class="pa-muted">This collection examines evidence and law; it is not an invitation to support a proscribed organisation. Proscription, an individual criminal charge, and a terrorism-related sentencing finding are separate legal questions.</p></aside>
      <section class="pa-questions" aria-label="Research questions"><article><span>01 / Law</span><h2>What is legal?</h2><p>Which power was used? What must be proved? What did the court actually decide?</p></article><article><span>02 / Institutions</span><h2>What is normal?</h2><p>Which relationships and decisions escape scrutiny? When is an accepted practice still open to challenge?</p></article><article><span>03 / Evidence</span><h2>What is real?</h2><p>Separate a document from an inference, an allegation from a finding, and a moral argument from a legal conclusion.</p></article></section>
      <details class="pa-record" id="legal-checks"><summary><strong>Source checks: citations, dates and sentencing</strong><span class="pa-muted">19 October 2026 · clarifications following reader feedback</span></summary><div class="pa-record-body">${collection.corrections.legal_checks.map((check) => `<h3>${e(check.title)}</h3><p>${e(check.text)}</p>${sourceList(check.sources)}`).join("")}<p class="pa-caution">These targeted checks do not certify every imported claim. The five campaign-claim corrections remain in the records and correction log below.</p></div></details>
      <p class="pa-caution">Editorial starting point: legality does not settle every moral question. Equally, an accusation of complicity is not proof. This collection asks what evidence would establish responsibility—and what evidence would challenge that account.</p>
      <section id="research"><h2>Follow the legal questions</h2><div class="pa-related">${related.map((r) => `<a href="/research/${r.id}/"><span class="pa-record-label">Research dossier</span><strong>${e(r.title)} →</strong><span>${e(r.summary)}</span></a>`).join("")}<a href="/uk-timeline/"><span class="pa-record-label">Wider context</span><strong>UK timeline →</strong><span>Trace the changing legal framework for protest and public order.</span></a></div></section>
      <section aria-label="Individual profiles and court reporting"><h2>People and proceedings</h2><div class="pa-related"><a href="/research/rajiv-menon-kc/"><span class="pa-record-label">Defence advocacy</span><strong>Rajiv Menon KC →</strong><span>The Filton closing speech, contempt proceedings and successive jurisdiction rulings.</span></a><a href="/research/sean-middlebrough/"><span class="pa-record-label">Public-record profile</span><strong>Sean Middlebrough →</strong><span>The later reported outcome, his earlier account and the distinction between different Filton trials.</span></a><a href="https://realmedia.press/third-filton-trial/" target="_blank" rel="noopener noreferrer"><span class="pa-record-label">Featured court reporting · Real Media</span><strong>The third Filton trial ↗</strong><span>Continuing coverage by Betty Dempsey and note-takers. Wider proceedings, not Middlebrough’s own trial.</span></a><a href="/research/hamas-deproscription/"><span class="pa-record-label">Separate proscription proceedings</span><strong>Hamas deproscription →</strong><span>Fahad Ansari, Riverway Law and the reported appeal history. A different organisation and a separate case.</span></a><a href="/research/hansard-record/"><span class="pa-record-label">Parliament and accountability</span><strong>Hansard and the disputed record →</strong><span>Sultana’s speech, the Commons explanation and the later FOI disclosure.</span></a><a href="/research/public-order/"><span class="pa-record-label">Legal framework</span><strong>Public order and protest →</strong><span>The reasonable-firmness test and separate powers to impose conditions.</span></a></div></section>
      <section id="report" class="pa-report"><a href="${pdf}" target="_blank" rel="noopener noreferrer"><img src="/publications/cage-putting-bodies-cover.png" width="708" height="1000" alt="Cover of CAGE International’s Putting Bodies on the Line report" loading="lazy"></a><div><span class="kicker">Source publication · November 2025</span><h2>Putting Bodies on the Line</h2><p>The Landscape of Direct Action and Civil Disobedience for Palestine in Britain.</p><p>CAGE International · 66 pages · PDF, 6.2 MB</p><p>An advocacy report covering campaigns, criminal proceedings, the Filton cases and allegations about institutional influence. Its arguments belong to its authors; they are not court findings or Independent Tribunal’s verification.</p><p><a class="pa-button" href="${pdf}" target="_blank" rel="noopener noreferrer">Read the full report ↗</a></p><p class="pa-muted">Third-party publication; rights remain with its rights holders. Preserved as supplied.</p></div></section>
      <section id="cases"><h2>One collection. The connected record.</h2><p>${cases.length} records, ordered by earliest recorded action date. Search cases, campaigns, institutional accounts and related actions in one place. These are not ${cases.length} convictions or necessarily distinct proceedings. Unaffiliated actions are labelled separately.</p>
      <div class="pa-controls" hidden><label>Search the records<input id="pa-search" type="search" placeholder="Case, court, place or name…"></label><label>Record category<select id="pa-category"><option value="all">All categories</option>${categories.map((c) => `<option value="${e(c)}">${e(labels[c] ?? title(c))}</option>`).join("")}</select></label><button type="button" id="pa-reset">Reset</button></div>
      <p id="pa-count" role="status" aria-live="polite">${cases.length} source records</p><p class="pa-caution">Expand a record for details, sources and any corrections. External source links open in a new tab. Conflicting dated accounts are retained where the evidence does not resolve them.</p>
      <div id="pa-records">${cases.map(caseCard).join("")}</div><p id="pa-empty" hidden>No records match. Try another term or reset the filters.</p></section>
      <section id="institutions"><h2>Lobbying and institutional scrutiny</h2><p>The seven CAGE-attributed accounts are integrated into the lobbying record. These are allegations and attributed descriptions, not findings of judicial interference. A meeting or contact does not, by itself, establish improper influence. Source review remains pending.</p><p><a href="#case-elbit-lobbying-foi">Explore the lobbying record →</a> · <a href="${pdf}#page=38" target="_blank" rel="noopener noreferrer">Read CAGE’s chapter, pages 38–42 ↗</a></p></section>
      <section id="method"><h2>One resource. Traceable sources.</h2><p>Both input files feed the same collection. Additional details are attached to the relevant records, not presented as a second dataset. Originals remain available for provenance; the unified JSON includes editorial corrections. This is a growing research index, not an exhaustive or continuously verified record.</p><p><a class="pa-button" href="${basePath}.json" target="_blank" rel="noopener noreferrer">Download the unified collection ↗</a></p>
      <details><summary>Corrections · 19 October 2026</summary><p>${e(collection.corrections.scope)}</p><ul>${Object.keys(collection.corrections.records).map((id) => `<li><a href="#case-${id}">${e(cases.find((c) => c.id === id).nickname)}</a>: ${e(collection.corrections.records[id].note)}</li>`).join("")}</ul></details>
      <details><summary>Data quality and original files</summary><p>Unresolved citation tokens were removed to parse the second input; they are not verified references. Its original “verified” labels are not our verification and are rendered as “reported”. Record-level provenance identifies each input. Original downloads are archival and may contain claims corrected in the unified collection.</p><ul>${issues.map((i) => `<li>${e(i.date)}: reported arrests ${i.reported_total}; geographic subtotals add to ${i.subtotal_sum}. The discrepancy remains unresolved.</li>`).join("")}<li>Source counts are not an audit of independence: several articles may repeat the same account.</li><li>Corporate decisions do not establish causation by a campaign without further evidence.</li><li>Names, custody status and trial outcomes have not all been rechecked. Inclusion alone warrants no adverse inference.</li></ul><h3>Original compiler’s limits</h3>${renderValue(base.limits)}<ul><li><a href="${basePath}/original-cases.json" target="_blank" rel="noopener noreferrer">First input — original JSON ↗</a></li><li><a href="${basePath}/original-supplement.txt" target="_blank" rel="noopener noreferrer">Second input — original unrepaired text ↗</a></li></ul></details></section>
      <script src="/palestine-action.js" defer></script>`,
  }));
}
