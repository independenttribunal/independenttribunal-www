import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// These are dated imports, not newly verified case reports. Keep that distinction
// in the public HTML, JSON and agent-facing text, not just in the editorial UI.
export async function loadResearch(dataDir, fail) {
  const records = [];
  for (const file of (await readdir(join(dataDir, "research"))).filter((f) => f.endsWith(".json"))) {
    const r = JSON.parse(await readFile(join(dataDir, "research", file), "utf8"));
    const where = `research/${file}`;
    for (const key of ["id", "title", "jurisdiction", "summary", "source_as_of", "migrated_on", "review_note", "body_html", "provenance"]) {
      if (!r[key]) fail(where, `missing ${key}`);
    }
    if (!/^[a-z0-9-]+$/.test(r.id) || file !== `${r.id}.json`) fail(where, "file name must match a safe id");
    for (const key of ["source_as_of", "migrated_on"]) if (!/^\d{4}-\d{2}-\d{2}$/.test(r[key])) fail(where, `${key} must be YYYY-MM-DD`);
    if (r.verification !== "historical-import-needs-current-review") fail(where, "import must retain its unverified status");
    if (!Array.isArray(r.tags) || !Array.isArray(r.links) || !Array.isArray(r.corrections)) fail(where, "tags, links and corrections must be arrays");
    const updateIds = new Set();
    for (const u of r.updates ?? []) {
      if (!/^[a-z0-9-]+$/.test(u.id) || updateIds.has(u.id)) fail(where, "updates require unique safe ids");
      updateIds.add(u.id);
      for (const key of ["date", "checked"]) if (!/^\d{4}-\d{2}-\d{2}$/.test(u[key])) fail(where, `update ${key} must be YYYY-MM-DD`);
      if (!u.title || !u.summary || !u.date_label || !u.paragraphs?.length || !u.sources?.length) fail(where, "updates require a title, dated account and sources");
      for (const s of u.sources ?? []) if (!s.title || !s.publisher || !s.type || !/^https:\/\//.test(s.url) || !/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) fail(where, "update sources require attribution, HTTPS and a checked date");
    }
    if (!r.provenance?.original_collection || !/^[a-f0-9]{40}$/.test(r.provenance?.commit)) fail(where, "historical source provenance required");
    if (r.supplementary) {
      if (!/^[a-z0-9-]+\.html$/.test(r.supplementary.body_file)) throw new Error(`${where}: invalid supplementary file`);
      if (!r.supplementary.title || !r.supplementary.note || !/^\d{4}-\d{2}-\d{2}$/.test(r.supplementary.date)) fail(where, "supplementary material requires a title, date and editorial note");
      r.supplementary.body_html = await readFile(join(dataDir, "research", "materials", r.supplementary.body_file), "utf8");
    }
    const allHtml = r.body_html + (r.supplementary?.body_html ?? "");
    // Imported markup is committed editorial content, never executable content.
    const allowedTags = new Set(["p", "a", "ul", "ol", "li", "span", "strong", "em", "b", "i", "h2", "h3", "h4", "blockquote", "cite", "br", "div", "section", "code", "small", "hr"]);
    for (const tag of allHtml.matchAll(/<\/?([a-z][\w:-]*)\b/gi)) if (!allowedTags.has(tag[1].toLowerCase())) fail(where, `unsupported HTML tag ${tag[1]}`);
    if (/\son\w+\s*=|\s(?:style|srcdoc)\s*=/i.test(allHtml)) fail(where, "active HTML attributes are not allowed");
    for (const a of allHtml.matchAll(/href="([^"]+)"/g)) {
      if (!/^(https:\/\/|#)/.test(a[1])) fail(where, `unsupported link ${a[1]}`);
    }
    for (const link of r.links ?? []) {
      if (!/^https:\/\//.test(link.url) || link.verification !== "imported-link-not-rechecked") fail(where, "imported links require HTTPS and an honest verification status");
      if (!r.body_html.includes(link.url)) fail(where, `source link missing from body: ${link.url}`);
    }
    records.push(r);
  }
  for (const r of records) for (const id of r.related_updates ?? []) {
    if (!records.some((other) => other.id === id && other.updates?.length)) fail(`research/${r.id}`, `no updates for related dossier ${id}`);
  }
  return records.sort((a, b) => a.order - b.order);
}

export const researchUpdatesText = (r) => (r.updates ?? []).map((u) => `Case update: ${u.title}\nEvent date: ${u.date}. Checked: ${u.checked}\n${u.summary}\n${u.paragraphs.join("\n\n")}\nSources: ${u.sources.map((s) => `${s.title} (${s.publisher}) <${s.url}>`).join("; ")}`).join("\n\n");

export const researchText = (html) => html
  .replace(/<\/(?:p|li|h[2-4]|blockquote)>/g, "\n\n")
  .replace(/<[^>]*>/g, " ")
  .replace(/&([a-z]+);/gi, (entity, name) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", pound: "£", middot: "·" }[name] ?? entity))
  .replace(/[ \t]+/g, " ").trim();

export async function publishResearch({ records, profiles = [], commentary = [], put, page, escapeHtml: e, site }) {
  const studies = profiles.filter((p) => p.category === "legal-study");
  profiles = profiles.filter((p) => p.category !== "legal-study");
  const updatesHtml = (r) => (r.updates ?? []).map((u) => `<section class="research-update" id="${u.id}" aria-labelledby="${u.id}-title"><p class="kicker">Case update · <time datetime="${u.date}">${e(u.date_label)}</time></p><h2 id="${u.id}-title">${e(u.title)}</h2><p><strong>${e(u.summary)}</strong></p>${u.paragraphs.map((p) => `<p>${e(p)}</p>`).join("")}<ul>${u.sources.map((s) => `<li><a href="${e(s.url)}">${e(s.title)}</a><br><span class="attributed">${e(s.publisher)}</span></li>`).join("")}</ul><p class="meta">Ruling checked ${e(u.checked)} · original dossier retained below</p></section>`).join("");
  const relatedUpdatesHtml = (r) => (r.related_updates ?? []).map((id) => {
    const other = records.find((x) => x.id === id);
    const u = other.updates[0];
    return `<aside class="research-update"><p class="kicker">${e(other.title)} · update ${e(u.date_label)}</p><p><strong>${e(u.summary)}</strong></p><p>The earlier Barclays5 comparisons below predate this decision. <a href="/research/${id}/#${u.id}">Read the ruling and sourced update →</a></p></aside>`;
  }).join("");
  const nav = (current) => `<nav class="research-nav" aria-label="Research dossiers">${records.map((r) => `<a href="/research/${r.id}/"${r.id === current ? ' aria-current="page"' : ""}>${e(r.title)}</a>`).join("")}</nav>`;
  const styles = `<style>
    .research-nav { display:flex; flex-wrap:wrap; gap:.5rem; margin:1.5rem 0 2rem; font:600 12px/1.5 ui-sans-serif,system-ui,sans-serif; }
    .research-nav a { padding:.6rem .8rem; border:1px solid var(--line); text-decoration:none; background:white; }
    .research-nav a[aria-current] { background:var(--navy); color:white; }
    .research-notice { padding:1rem 1.3rem; border-left:3px solid var(--gold); background:#eee8da; margin:1.5rem 0; }
    .research-notice p { margin:.4rem 0; }
    .research-notice strong { font-family:ui-sans-serif,system-ui,sans-serif; }
    .research-update { padding:1.3rem; margin:1.5rem 0; background:white; border:1px solid #bacbc7; border-top:4px solid #286355; }
    .research-update h2 { margin:.7rem 0 1rem; }
    .research-update .kicker { line-height:1.5; color:#24574c; }
    .research-update .meta { margin-bottom:0; }
    .research-body { overflow-wrap:anywhere; }
    .research-body .src { list-style:none; padding:0; font:inherit; color:inherit; }
    .research-body .src li { padding:1.4rem 0; margin:0; border-top:1px solid var(--line); }
    .research-body .title { display:block; font-weight:700; }
    .research-body .outlet, .research-body .url { display:block; font:13px/1.65 ui-sans-serif,system-ui,sans-serif; margin-top:.3rem; color:var(--muted); }
    .research-body .note { display:block; margin-top:.5rem; font-size:.95rem; }
    .research-body .lean { border:1px solid var(--line); padding:.1rem .35rem; font-size:11px; }
    .research-body blockquote { margin:1.2rem 0; padding:.2rem 1.2rem; border-left:2px solid var(--gold); }
    .research-body .callout { padding:1rem; background:white; border:1px solid var(--line); }
    .research-body .ref { font-size:.85rem; color:var(--muted); }
    .research-provenance { padding-top:1rem; margin-top:2rem; border-top:1px solid var(--line); overflow-wrap:anywhere; }
    .historical-commentary { border-left:2px solid var(--line); padding-left:1.2rem; }
    .historical-commentary .compare, .historical-commentary .act { margin:1.3rem 0; }
    .historical-commentary .cell { padding:1rem; background:white; border:1px solid var(--line); }
    .historical-commentary .sum { font-size:1.5rem; }
    .historical-commentary .when, .historical-commentary .rule { font-weight:bold; margin-top:1rem; }
    a:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
    @media print { .research-nav, .contact { display:none; } }
  </style>`;
  await put("research/index.html", page({
    title: "Legal research", path: "/research/", description: "Research dossiers, public-record profiles and labelled commentary on law, rights and institutional accountability.",
    meta: `<p class="meta">Open research · <a href="/data/research.json">Dossiers JSON</a> · <a href="/data/profiles.json">Profiles JSON</a> · <a href="/legal/editorial-standards/">Editorial standards</a></p>`,
    body: `${styles}<div class="kicker">Independent Tribunal · Research library</div><h1>Follow the evidence.</h1>
      <p class="lede">Separate cases, distinct legal questions, and a public record you can examine for yourself.</p>
      <h2>Featured collection</h2><ul class="policy-list"><li><span class="kicker">UK · Cases, records and institutional accountability</span><h3><a href="/research/palestine-action/">Palestine Action →</a></h3><p>What is legal? What is normal? What is real? Explore the case index, CAGE report, supplementary accounts and connected legal research—with source status and limitations visible.</p></li></ul>
      ${studies.length ? `<h2>Open justice and reporting restrictions</h2><p>Three linked legal studies: secrecy about proceedings, protection of identity, and identification through combined information. Court findings and our analysis are distinguished.</p><ul class="policy-list">${studies.map((p) => `<li><span class="kicker">Legal study · ${e(p.jurisdiction)}</span><h3><a href="/research/${p.id}/">${e(p.title)} →</a></h3><p>${e(p.summary)}</p><span class="meta">Sources reviewed ${e(p.checked)}</span></li>`).join("")}</ul>` : ""}
      ${commentary.length ? `<h2>Commentary and research questions</h2><p>Arguments and questions, distinguished from verified facts and findings. Anecdotes, satire and limitations are labelled.</p><ul class="policy-list">${commentary.map((p) => `<li><span class="kicker">${e(p.genre)}</span><h3><a href="/research/${p.id}/">${e(p.title)} →</a></h3><p>${e(p.summary)}</p><span class="meta">Cited sources checked ${e(p.checked)} · <a href="/data/commentary/${p.id}.json">JSON</a></span></li>`).join("")}</ul>` : ""}
      ${profiles.length ? `<h2>Public-record profiles</h2><p>Selected court records and public background. Individually sourced; not a judges database or a complete criminal record.</p><ul class="policy-list">${profiles.map((p) => `<li><span class="kicker">${e(p.subtitle)}</span><h3><a href="/research/${p.id}/">${e(p.title)} →</a></h3><p>${e(p.summary)}</p><span class="meta">Sources reviewed ${e(p.checked)} · coverage limits stated</span></li>`).join("")}</ul>` : ""}
      <h2>Research dossiers</h2>
      <aside class="research-notice"><strong>About this research collection</strong><p>Independent Tribunal maintains these six dossiers and their source material. The original research is dated 28 July 2026. Read any dated case updates first; the historical material has not had a full current-status review. It includes reporting and commentary, not just primary sources.</p></aside>
      <ul class="policy-list">${records.map((r) => `<li><span class="kicker">0${r.order} · ${e(r.jurisdiction)}</span><h2><a href="/research/${r.id}/">${e(r.title)} →</a></h2><p>${e(r.summary)}</p><span class="meta">Historical dossier · source date ${e(r.source_as_of)}</span></li>`).join("")}</ul>`,
  }));
  for (const r of records) {
    const source = `${site.source_repo}/blob/main/data/research/${r.id}.json`;
    await put(`research/${r.id}/index.html`, page({
      title: r.title, description: r.summary, path: `/research/${r.id}/`,
      meta: `<p class="meta">Source dossier: ${e(r.source_as_of)} · Migrated: ${e(r.migrated_on)} (not a verification date)<br><a href="/data/research/${r.id}.json">Download this dossier as JSON</a> · <a href="${site.source_repo}/commits/main/data/research/${r.id}.json">Edit history</a></p>`,
      body: `${styles}<div class="kicker"><a href="/research/">Legal research</a> · ${e(r.jurisdiction)}</div>
        <h1>${e(r.title)}</h1><p class="lede">${e(r.summary)}</p>${r.id !== "prairieland" ? '<p><a href="/research/palestine-action/">Palestine Action research collection →</a></p>' : ""}${updatesHtml(r)}${relatedUpdatesHtml(r)}${nav(r.id)}
        <aside class="research-notice" aria-label="Research status"><strong>Historical dossier · current-status review pending</strong><p>The imported research is dated <time datetime="${r.source_as_of}">28 July 2026</time>. Its original reporting, quotations and annotations are preserved below; do not read them as confirmed current outcomes. Links have not all been rechecked.</p><p>${e(r.review_note)}</p></aside>
        ${r.corrections.length ? `<section aria-label="Corrections"><h2>Migration corrections</h2>${r.corrections.map((c) => `<p>${e(c.text)} <a href="${e(c.url)}">Statutory source</a> <span class="meta">(${e(c.date)})</span></p>`).join("")}</section>` : ""}
        <h2 id="original-dossier">Original dossier · July 2026</h2><p class="attributed">The following narrative and source annotations are the original author’s research and commentary. Publisher labels such as “Campaign” or “Partisan” are the author’s descriptions, not independent ratings. Allegations, reported verdicts and opinions must be distinguished and checked against the primary record.</p>
        <article class="research-body" aria-label="Imported research">${r.body_html}</article>
        ${r.id === "terrorist-connection" ? '<p class="attributed">Hansard excerpts: UK Parliament, reproduced under the <a href="https://www.parliament.uk/site-information/copyright-parliament/open-parliament-licence/">Open Parliament Licence</a>. Commentary is separate from the parliamentary record.</p>' : ""}
        ${r.supplementary ? `<section id="original-commentary"><h2>${e(r.supplementary.title)}</h2><p class="research-notice">${e(r.supplementary.note)}${r.updates?.length ? ` <a href="#${r.updates[0].id}">Read the case update</a>.` : ""}</p><div class="research-body historical-commentary">${r.supplementary.body_html}</div></section>` : ""}
        <section class="research-provenance"><h2>Sources &amp; corrections</h2><p>This dossier, its annotations and source links are maintained by Independent Tribunal. <a href="${source}">View the source data</a> or <a href="/data/research/${r.id}.json">download the complete dossier</a>${r.supplementary ? `, including the historical brochure commentary` : ""}.</p><p>Have a judgment, sentencing remark or correction? <a href="${site.contact.issues}">Submit a source or correction</a>. Do not post private case material publicly.</p></section>
        <h2>Explore the collection</h2>${nav(r.id)}`,
    }));
  }
}
