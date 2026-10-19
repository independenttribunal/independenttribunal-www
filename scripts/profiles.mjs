import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Current, individually sourced profiles are separate from the dated research imports.
export function validateProfile(p, fail) {
  const safeId = /^[a-z0-9-]+$/;
  const date = /^\d{4}-\d{2}-\d{2}$/;
  for (const key of ["id", "title", "subtitle", "summary", "scope", "status_note", "jurisdiction"]) {
    if (typeof p[key] !== "string" || !p[key].trim()) fail(`missing ${key}`);
  }
  if (!safeId.test(p.id) || !date.test(p.checked)) fail("safe id and checked date required");
  if (p.category && p.category !== "legal-study") fail("unknown profile category");
  for (const related of [...(p.related ?? []), ...(p.research_links ?? [])]) {
    if (!safeId.test(related.id) || !related.title) fail("related pages require a safe id and title");
  }
  for (const key of ["tags", "highlights", "sections", "sources"]) if (!Array.isArray(p[key]) || !p[key].length) fail(`${key} must be a nonempty array`);
  const sourceIds = new Set();
  for (const s of p.sources ?? []) {
    if (!safeId.test(s.id) || sourceIds.has(s.id)) fail("source ids must be safe and unique");
    sourceIds.add(s.id);
    for (const key of ["title", "publisher", "type"]) if (!s[key]) fail(`source ${s.id}: missing ${key}`);
    if (!/^https:\/\//.test(s.url) || !date.test(s.checked)) fail(`source ${s.id}: HTTPS and checked date required`);
    if (s.date && !date.test(s.date)) fail(`source ${s.id}: invalid event date`);
  }
  const anchorIds = new Set(["sources"]);
  const addAnchor = (id) => {
    if (!safeId.test(id) || anchorIds.has(id)) fail(`unsafe or duplicate anchor ${id}`);
    anchorIds.add(id);
  };
  for (const section of p.sections ?? []) {
    addAnchor(section.id);
    if (!section.title || !section.intro || !section.entries?.length) fail(`section ${section.id}: title, intro and entries required`);
    for (const entry of section.entries ?? []) {
      addAnchor(entry.id);
      if (!entry.title || !entry.kind || !entry.paragraphs?.length) fail(`entry ${entry.id}: title, kind and paragraphs required`);
      if (entry.date && !date.test(entry.date)) fail(`entry ${entry.id}: invalid date`);
      for (const paragraph of entry.paragraphs ?? []) {
        if (!paragraph.text || !Array.isArray(paragraph.sources)) fail(`entry ${entry.id}: text and source array required`);
        if (!paragraph.sources?.length && entry.kind !== "Research method" && entry.kind !== "Coverage limitation") fail(`entry ${entry.id}: factual paragraph requires sources`);
        for (const s of paragraph.sources ?? []) if (!sourceIds.has(s.id)) fail(`entry ${entry.id}: unknown source ${s.id}`);
      }
    }
  }
  for (const h of p.highlights ?? []) {
    if (!h.label || !h.value || !h.detail || !anchorIds.has(h.target)) fail("highlight requires text and an existing target");
  }
  if (p.featured_source && !sourceIds.has(p.featured_source)) fail("unknown featured source");
}

export async function loadProfiles(dataDir, fail) {
  const profiles = [];
  for (const file of (await readdir(join(dataDir, "profiles"))).filter((f) => f.endsWith(".json"))) {
    const p = JSON.parse(await readFile(join(dataDir, "profiles", file), "utf8"));
    validateProfile(p, (message) => fail(`profiles/${file}`, message));
    if (file !== `${p.id}.json`) fail(`profiles/${file}`, "file name must match id");
    profiles.push(p);
  }
  for (const p of profiles) for (const related of p.related ?? []) {
    if (!profiles.some((other) => other.id === related.id && other.id !== p.id)) fail(`profiles/${p.id}`, "related page must exist and not link to itself");
  }
  return profiles;
}

export function profileText(p) {
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  return [
    `## ${p.title} — ${p.subtitle}\nURL: ${p.url}\nSource review: ${p.checked}\n${p.scope}\n${p.status_note}`,
    ...p.highlights.map((h) => `${h.label}: ${h.value}. ${h.detail}.`),
    ...p.sections.map((section) => `### ${section.title}\n${section.intro}\n` + section.entries.map((entry) =>
      `#### ${entry.title}\n${entry.kind}${entry.date ? ` · ${entry.date}` : ""}${entry.citation ? ` · ${entry.citation}` : ""}\n` + entry.paragraphs.map((para) => `${para.text}\n${para.sources.map((ref) => {
        const s = sources.get(ref.id);
        return `Source: ${s.title} (${s.publisher}; ${s.type}; checked ${s.checked})${ref.locator ? `, ${ref.locator}` : ""} <${s.url}>`;
      }).join("\n")}`).join("\n\n")
    ).join("\n\n")),
  ].join("\n\n");
}

export async function publishProfiles({ profiles, put, page, escapeHtml: e, site }) {
  for (const p of profiles) {
    const order = [...new Set(p.sections.flatMap((section) => section.entries.flatMap((entry) => entry.paragraphs.flatMap((para) => para.sources.map((ref) => ref.id)))))];
    const orderedSources = [...order.map((id) => p.sources.find((s) => s.id === id)), ...p.sources.filter((s) => !order.includes(s.id))];
    const sources = new Map(orderedSources.map((s, i) => [s.id, { ...s, number: i + 1 }]));
    const featured = sources.get(p.featured_source);
    const citations = (refs) => refs.length ? `<span class="profile-citations">${refs.map((ref) => {
      const s = sources.get(ref.id);
      return `<a href="${e(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="Source ${s.number}: ${e(s.title)} (opens in a new tab)">[${s.number}] ${e(ref.locator ?? s.type)}</a>`;
    }).join(" · ")}</span>` : "";
    await put(`research/${p.id}/index.html`, page({
      title: p.title, description: p.summary, path: `/research/${p.id}/`,
      meta: `<p class="meta">Sources reviewed ${e(p.checked)} · <a href="/data/profiles/${p.id}.json">Download JSON</a> · <a href="${site.source_repo}/commits/main/data/profiles/${p.id}.json">Edit history</a></p>`,
      body: `<style>
        .profile-hero { border-top:4px solid var(--navy); padding-top:1.6rem; }
        .profile-scope { border-left:3px solid var(--gold); padding:.8rem 1.2rem; background:#eee8da; font-size:.95rem; }
        .profile-status { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; margin:1.7rem 0; }
        .profile-status a { display:flex; flex-direction:column; gap:.7rem; padding:1rem; border:1px solid var(--line); background:white; text-decoration:none; }
        .profile-status small { font:600 11px/1.5 ui-sans-serif,system-ui,sans-serif; color:var(--muted); }
        .profile-status strong { font-size:1.2rem; line-height:1.3; }
        .profile-nav { display:flex; flex-wrap:wrap; gap:.5rem 1rem; padding:1rem 0; border-block:1px solid var(--line); font:600 13px/1.6 ui-sans-serif,system-ui,sans-serif; }
        .profile-section { scroll-margin-top:1.5rem; margin-top:3rem; }
        .profile-entry { border-top:1px solid var(--line); padding-top:1rem; margin-top:1.5rem; scroll-margin-top:1.5rem; }
        .profile-entry h3 { margin-top:.6rem; }
        .profile-entry .meta { font-size:11px; }
        .profile-citations { display:block; font:12px/1.6 ui-sans-serif,system-ui,sans-serif; margin:.4rem 0 1.3rem; color:var(--muted); }
        .profile-sources { padding-left:1.5rem; font-size:.95rem; }
        .profile-sources li { margin-bottom:1rem; overflow-wrap:anywhere; }
        .profile-sources small { display:block; color:var(--muted); font:12px/1.6 ui-sans-serif,system-ui,sans-serif; }
        a:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
        @media(max-width:560px) { .profile-status { grid-template-columns:1fr; } }
        @media print { .profile-nav,.contact { display:none; } }
      </style>
      <div class="profile-hero"><a href="/research/" class="kicker">Independent Tribunal · Research</a><h1>${e(p.title)}</h1><p class="lede">${e(p.subtitle)}</p><p>${e(p.summary)}</p><p class="meta">${e(p.jurisdiction)} · Sources reviewed <time datetime="${p.checked}">${e(p.checked)}</time></p></div>
      <aside class="profile-scope">${e(p.scope)}</aside>
      <div class="profile-status">${p.highlights.map((h) => `<a href="#${h.target}"><small>${e(h.label)}</small><strong>${e(h.value)}</strong><small>${e(h.detail)}</small></a>`).join("")}</div>
      <p class="attributed">${e(p.status_note)}</p>
      ${featured ? `<p><a href="${e(featured.url)}" target="_blank" rel="noopener noreferrer">Read the report from ${e(featured.publisher)} ↗</a> <span class="meta">(opens in a new tab)</span></p>` : ""}
      <nav class="profile-nav" aria-label="On this page">${p.sections.map((s) => `<a href="#${s.id}">${e(s.title)}</a>`).join("")}<a href="#sources">Source register</a></nav>
      ${p.sections.map((s) => `<section class="profile-section" id="${s.id}"><h2>${e(s.title)}</h2><p class="attributed">${e(s.intro)}</p>${s.entries.map((entry) => `<article class="profile-entry" id="${entry.id}"><p class="meta">${e(entry.kind)}${entry.date ? ` · <time datetime="${entry.date}">${e(entry.date)}</time>` : ""}</p><h3>${e(entry.title)}</h3>${entry.citation ? `<p><strong>${e(entry.citation)}</strong></p>` : ""}${entry.paragraphs.map((para) => `<p>${e(para.text)}</p>${citations(para.sources)}`).join("")}</article>`).join("")}</section>`).join("")}
      <section class="profile-section" id="sources"><h2>Source register</h2><p>Sources are numbered in order of first citation; repeated citations keep their number. Source links open in a new tab. A source’s type matters: a campaign statement or personal account is not a judgment. The review date records this page’s source check, not a guarantee of completeness.</p><ol class="profile-sources">${orderedSources.map((s) => `<li id="source-${s.id}"><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a><small>${e(s.publisher)} · ${e(s.type)}${s.date ? ` · ${e(s.date)}` : ""}<br>Checked ${e(s.checked)}</small></li>`).join("")}</ol></section>
      <h2>Related research</h2><ul>${p.related || p.research_links ? [...(p.related ?? []), ...(p.research_links ?? [])].map((r) => `<li><a href="/research/${r.id}/">${e(r.title)}</a></li>`).join("") : '<li><a href="/uk-timeline/">UK timeline</a></li><li><a href="/nuances/jury-conscience/">Jury conscience</a></li><li><a href="/nuances/lawful-excuse/">Lawful excuse</a></li>'}</ul><p><a href="${site.source_repo}/blob/main/data/profiles/${p.id}.json">View the maintained source</a> · <a href="${site.contact.issues}">Submit a source or correction</a>. Do not post private case material publicly.</p>`,
    }));
  }
}
