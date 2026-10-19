// Builds the data-first parts of the site from /data into /public.
//
// /data is the source of truth (JSON + Markdown, edited by hand or by agents).
// This script validates it, then generates:
//   public/data/**            machine-readable JSON (sources resolved inline)
//   public/uk-timeline/       the timeline page, from templates/uk-timeline.html
//   public/legal/**           policy pages (HTML) + their raw Markdown
//   public/nuances/**         one page per legal nuance + an index
//   public/independent-tribunals/**  one page per people's tribunal + an index
//   public/data/tiles.json    the homepage grid (nuances, tribunals, timelines)
//   public/llms.txt           guide for AI agents (llmstxt.org)
//   public/llms-full.txt      everything above as plain text, one fetch
//   public/robots.txt, public/sitemap.xml
//
// Zero dependencies. Run: node scripts/build-data.mjs  (also runs before dev/build).

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadResearch, publishResearch, researchText, researchUpdatesText } from "./research.mjs";
import { loadProfiles, publishProfiles, profileText } from "./profiles.mjs";
import { loadCommentary, publishCommentary, commentaryText } from "./commentary.mjs";
import { renderSiteHeader, renderSiteFooter } from "../shared/site-shell.mjs";
import { loadPalestineAction, publishPalestineAction, palestineActionTile } from "./palestine-action.mjs";
import { loadForensics, publishForensics, forensicTile, forensicText, forensicPath } from "./forensics.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const publicDir = join(root, "public");
const GENERATED = ["data", "legal", "nuances", "independent-tribunals", "research", "people", "forensics", "uk-timeline", "llms.txt", "llms-full.txt", "robots.txt", "sitemap.xml"];

const REFERENCE_TYPES = new Set(["legislation", "judgment", "official", "report", "article", "organisation", "dataset"]);
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

// ---------- tiny Markdown (the subset our policies use) ----------

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Links to sibling policies are written as `slug.md` so they also work on GitHub.
const policyHref = (href) => href.replace(/^(?:\.\/)?([a-z0-9-]+)\.md(#.*)?$/, "/legal/$1/$2");

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const url = policyHref(href);
    const external = /^https?:\/\//.test(url);
    return `<a href="${url}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

function markdown(md) {
  const out = [];
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`); list = null; };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
      flushPara(); flushList();
      const level = m[1].length;
      const id = m[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<h${level} id="${id}">${inline(m[2])}</h${level}>`);
      continue;
    }
    if ((m = line.match(/^\s*(-|\d+\.)\s+(.*)$/))) {
      flushPara();
      const tag = m[1] === "-" ? "ul" : "ol";
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(m[2]);
      continue;
    }
    if (list && /^\s{2,}\S/.test(line)) { list.items[list.items.length - 1] += ` ${line.trim()}`; continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join("\n");
}

const plain = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");

function frontMatter(text, where) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { fail(where, "missing front matter"); return { meta: {}, body: text }; }
  const meta = Object.fromEntries(m[1].split("\n").map((l) => {
    const i = l.indexOf(":");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }));
  return { meta, body: m[2].trim() + "\n" };
}

// ---------- load + validate ----------

const site = await readJson(join(dataDir, "site.json"));
const { references } = await readJson(join(dataDir, "references.json"));
const refById = new Map();
for (const r of references) {
  const where = `references.json#${r.id ?? "?"}`;
  for (const k of ["id", "title", "publisher", "date", "url", "type", "jurisdiction", "summary", "checked"]) if (!r[k]) fail(where, `missing ${k}`);
  if (refById.has(r.id)) fail(where, "duplicate id");
  if (r.url && !/^https:\/\//.test(r.url)) fail(where, "url must be https");
  if (r.type && !REFERENCE_TYPES.has(r.type)) fail(where, `unknown type "${r.type}"`);
  if (r.date && !DATE.test(r.date)) fail(where, `date "${r.date}" must be YYYY, YYYY-MM or YYYY-MM-DD`);
  if (r.checked && !/^\d{4}-\d{2}-\d{2}$/.test(r.checked)) fail(where, "checked must be YYYY-MM-DD");
  refById.set(r.id, r);
}

const timelineFiles = (await readdir(join(dataDir, "timelines"))).filter((f) => f.endsWith(".json")).sort();
const timelines = [];
for (const file of timelineFiles) {
  const t = await readJson(join(dataDir, "timelines", file));
  const ids = new Set();
  const checkSources = (where, sources) => {
    if (!Array.isArray(sources)) return fail(where, "sources must be an array");
    for (const s of sources) if (!refById.has(s)) fail(where, `unknown source "${s}"`);
  };
  for (const section of t.sections) {
    if (section.type === "explainer") { checkSources(`${file}#${section.id}`, section.sources); ids.add(section.id); continue; }
    for (const e of section.entries) {
      const where = `${file}#${e.id ?? "?"}`;
      for (const k of ["id", "date", "date_label", "kind", "title", "body"]) if (!e[k]) fail(where, `missing ${k}`);
      if (ids.has(e.id)) fail(where, "duplicate id");
      ids.add(e.id);
      if (!t.kinds[e.kind]) fail(where, `unknown kind "${e.kind}"`);
      if (!DATE.test(e.date)) fail(where, `date "${e.date}" must be YYYY, YYYY-MM or YYYY-MM-DD`);
      checkSources(where, e.sources);
    }
  }
  timelines.push(t);
}

const timelineEntryIds = new Set(timelines.flatMap((t) => t.sections.flatMap((s) => s.type === "explainer" ? [s.id] : s.entries.map((e) => e.id))));
const nuanceFiles = (await readdir(join(dataDir, "nuances"))).filter((f) => f.endsWith(".json")).sort();
const nuances = [];
for (const file of nuanceFiles) {
  const n = await readJson(join(dataDir, "nuances", file));
  const where = `nuances/${file}`;
  if (file !== `${n.id}.json`) fail(where, "file name must match id");
  for (const k of ["id", "title", "label", "jurisdiction", "summary", "rule", "nuance", "why_it_matters", "history", "sources", "checked"]) if (!n[k]) fail(where, `missing ${k}`);
  if (!Array.isArray(n.nuance) || !n.nuance.length) fail(where, "nuance must be a non-empty array of paragraphs");
  for (const id of n.sources ?? []) if (!refById.has(id)) fail(where, `unknown source "${id}"`);
  for (const h of n.history ?? []) {
    if (!DATE.test(h.date)) fail(where, `history date "${h.date}" must be YYYY, YYYY-MM or YYYY-MM-DD`);
    for (const id of h.sources ?? []) if (!refById.has(id)) fail(where, `unknown history source "${id}"`);
  }
  for (const id of n.related?.timeline ?? []) if (!timelineEntryIds.has(id)) fail(where, `unknown timeline entry "${id}"`);
  nuances.push(n);
}
nuances.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const tribunalFiles = (await readdir(join(dataDir, "tribunals"))).filter((f) => f.endsWith(".json")).sort();
const tribunals = [];
for (const file of tribunalFiles) {
  const t = await readJson(join(dataDir, "tribunals", file));
  const where = `tribunals/${file}`;
  if (file !== `${t.id}.json`) fail(where, "file name must match id");
  for (const k of ["id", "name", "tags", "status", "convened_by", "question", "summary", "sat", "findings", "nuance", "legal_status", "sources", "checked"]) if (!t[k]) fail(where, `missing ${k}`);
  for (const id of t.sources ?? []) if (!refById.has(id)) fail(where, `unknown source "${id}"`);
  for (const e of [...(t.sat ?? []), ...(t.aftermath ?? []), ...(t.responses ?? [])]) {
    if (!DATE.test(e.date)) fail(where, `date "${e.date}" must be YYYY, YYYY-MM or YYYY-MM-DD`);
    for (const id of e.sources ?? []) if (!refById.has(id)) fail(where, `unknown source "${id}"`);
  }
  tribunals.push(t);
}
for (const t of tribunals) for (const id of t.related_tribunals ?? []) if (!tribunals.some((x) => x.id === id)) fail(`tribunals/${t.id}.json`, `unknown related tribunal "${id}"`);
// UK first (we are in the UK), then everything else; stable by name.
const ukFirst = (x) => (/UK|United Kingdom|England/.test(x.jurisdiction ?? (x.tags?.includes("uk") ? "UK" : "")) ? 0 : 1);
tribunals.sort((a, b) => ukFirst(a) - ukFirst(b) || a.name.localeCompare(b.name));

const policyFiles = (await readdir(join(dataDir, "policies"))).filter((f) => f.endsWith(".md")).sort();
const policies = [];
for (const file of policyFiles) {
  const where = `policies/${file}`;
  const { meta, body } = frontMatter(await readFile(join(dataDir, "policies", file), "utf8"), where);
  for (const k of ["title", "summary", "updated"]) if (!meta[k]) fail(where, `missing ${k}`);
  policies.push({ slug: file.replace(/\.md$/, ""), ...meta, order: Number(meta.order ?? 99), body });
}
policies.sort((a, b) => a.order - b.order);

const research = await loadResearch(dataDir, fail);
const palestineAction = await loadPalestineAction(dataDir);
const profiles = await loadProfiles(dataDir, fail);
const forensics = await loadForensics(dataDir);
for (const p of profiles) for (const related of p.research_links ?? []) {
  if (![...research.map((r) => r.id), palestineActionTile.id].includes(related.id)) fail(`profiles/${p.id}`, `missing related research ${related.id}`);
}
const commentary = await loadCommentary(dataDir, fail);
for (const p of commentary) if ([...research, ...profiles].some((r) => r.id === p.id)) fail(`commentary/${p.id}`, "commentary id conflicts with a research page");
for (const p of profiles) if (research.some((r) => r.id === p.id)) fail(`profiles/${p.id}`, "profile id conflicts with a research dossier");

if (errors.length) {
  console.error(`✗ data validation failed (${errors.length}):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

// ---------- write ----------

const built = new Date().toISOString();
const builtDay = built.slice(0, 10);
const abs = (path) => new URL(path, site.url).href;

for (const name of GENERATED) await rm(join(publicDir, name), { recursive: true, force: true });
const put = async (path, content) => {
  const full = join(publicDir, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, typeof content === "string" || Buffer.isBuffer(content) ? content : JSON.stringify(content, null, 2) + "\n");
};

const resolve = (ids) => ids.map((id) => {
  const r = refById.get(id);
  return { id, title: r.title, url: r.url, type: r.type };
});

// JSON for agents: timelines with sources resolved, so one fetch is enough.
const timelinesOut = timelines.map((t) => ({
  ...t,
  url: abs(t.path),
  sections: t.sections.map((s) => s.type === "explainer"
    ? { ...s, sources: resolve(s.sources) }
    : { ...s, entries: s.entries.map((e) => ({ ...e, url: abs(`${t.path}#${e.id}`), sources: resolve(e.sources) })) }),
}));
const allEntries = timelines.flatMap((t) => t.sections.flatMap((s) => s.entries ?? []));
const unsourced = allEntries.filter((e) => e.sources.length === 0).map((e) => e.id);

for (const t of timelinesOut) await put(`data/timelines/${t.id}.json`, t);
await put("data/references.json", { generated: built, license: site.license, references });
const timelineOf = (id) => timelines.find((t) => t.sections.some((s) => s.id === id || (s.entries ?? []).some((e) => e.id === id)));
const nuancesOut = nuances.map((n) => ({
  ...n,
  url: abs(`/nuances/${n.id}/`),
  sources: resolve(n.sources),
  history: n.history.map((h) => ({ ...h, sources: resolve(h.sources ?? []) })),
  related: { ...n.related, timeline: (n.related?.timeline ?? []).map((id) => abs(`${timelineOf(id).path}#${id}`)) },
}));
await put("data/nuances.json", { generated: built, license: site.license, about: "Legal nuances: what the rule says, the point most people miss, and the dated history behind it. Each claim links to primary sources.", nuances: nuancesOut });

const tribunalsOut = tribunals.map((t) => ({
  ...t,
  url: abs(`/independent-tribunals/${t.id}/`),
  sources: resolve(t.sources),
  sat: t.sat.map((e) => ({ ...e, sources: resolve(e.sources ?? []) })),
  aftermath: (t.aftermath ?? []).map((e) => ({ ...e, sources: resolve(e.sources ?? []) })),
  responses: (t.responses ?? []).map((e) => ({ ...e, sources: resolve(e.sources ?? []) })),
}));
await put("data/tribunals.json", { generated: built, license: site.license, about: "People's and independent tribunals: who convened them, what they asked, what they found (attributed to them), their legal status, and the primary record. A tribunal's findings are its own, not a court's and not ours.", tribunals: tribunalsOut });

const profilesOut = profiles.map((p) => ({
  ...p,
  url: abs(`/research/${p.id}/`),
  sections: p.sections.map((s) => ({ ...s, entries: s.entries.map((entry) => ({ ...entry, paragraphs: entry.paragraphs.map((para) => ({
    ...para, sources: para.sources.map((ref) => ({ ...p.sources.find((source) => source.id === ref.id), ...(ref.locator ? { locator: ref.locator } : {}) })),
  })) })) })),
}));
await put("data/profiles.json", { generated: built, about: "Selected public-record profiles and legal studies (category: legal-study), not a judges database or complete criminal records. Preserve source types, attributed accounts, review dates and coverage limits. Analysis is distinguished from court findings.", profiles: profilesOut });
for (const p of profilesOut) await put(`data/profiles/${p.id}.json`, p);
const commentaryOut = commentary.map((p) => ({ ...p, url: abs(`/research/${p.id}/`) }));
await put("data/commentary.json", { generated: built, about: "Labelled commentary and research questions. Preserve satire labels, anecdote provenance, source scopes and unknown values. Not findings of misconduct or clinical assessments.", commentary: commentaryOut });
for (const p of commentaryOut) await put(`data/commentary/${p.id}.json`, p);

const tiles = [
  forensicTile(forensics),
  palestineActionTile,
  ...commentary.map((p) => ({ kind: "commentary", id: p.id, title: p.title, label: p.genre, summary: p.summary, tags: p.tags, href: `/research/${p.id}/`, uk: p.tags.includes("uk") })),
  ...profiles.map((p) => ({ kind: p.category === "legal-study" ? "study" : "profile", id: p.id, title: p.title, label: p.subtitle, summary: p.summary, tags: p.category === "legal-study" ? p.tags : [...new Set(["people", ...p.tags])], href: `/research/${p.id}/`, uk: p.tags.includes("uk") })),
  ...research.map((r) => ({ kind: "research", id: r.id, title: r.title, label: `${r.jurisdiction} · ${r.updates?.length ? "case update available" : "historical dossier"}`, summary: r.summary, tags: [...r.tags, "research"], href: `/research/${r.id}/`, uk: r.tags.includes("uk") })),
  ...nuancesOut.map((n) => ({ kind: "nuance", id: n.id, title: n.title, label: n.label, summary: plain(n.summary), tags: n.tags ?? [], href: `/nuances/${n.id}/`, uk: true })),
  ...timelinesOut.map((t) => ({ kind: "timeline", id: t.id, title: t.title, label: t.kicker, summary: plain(t.description), tags: ["protest", "timeline"], href: t.path, uk: true })),
  ...tribunalsOut.map((t) => ({ kind: "tribunal", id: t.id, title: t.name, label: `Independent tribunal · ${t.status}`, summary: plain(t.summary), tags: t.tags, href: `/independent-tribunals/${t.id}/`, uk: t.tags.includes("uk") })),
].sort((a, b) => Number(b.uk) - Number(a.uk));
await put("data/tiles.json", { generated: built, tiles });

const researchOut = research.map((r) => ({ ...r, url: abs(`/research/${r.id}/`), body_text: researchText(r.body_html) }));
await put("data/research.json", { generated: built, about: "Independent Tribunal research dossiers and source material. Read any separately sourced updates before the historical body and supplementary commentary. Each update has its own event date, checked date and sources; it does not verify the rest of the dossier. Original source annotations are commentary; imported links have not all been rechecked.", research: researchOut });
for (const r of researchOut) await put(`data/research/${r.id}.json`, r);

await put("data/policies.json", {
  generated: built,
  policies: policies.map(({ slug, title, summary, updated }) => ({ slug, title, summary, updated, url: abs(`/legal/${slug}/`), markdown: abs(`/legal/${slug}.md`) })),
});
await put("data/index.json", {
  name: site.name,
  url: site.url,
  summary: site.summary,
  generated: built,
  license: site.license,
  source_repo: site.source_repo,
  how_to_cite: "Cite the primary source each entry links to (sources[].url), and this site as the compiler.",
  datasets: [
    { id: "sovereign-ai-forensics", url: abs("/data/forensics/sovereign-ai.json"), page: abs(forensicPath), count: forensics.changes.length, description: "Nine grouped wording edits between two guidance PDFs, byte-verified sources and archive copies, limits and draft FOI questions. Not findings of wrongdoing." },
    { id: "palestine-action", url: abs("/data/collections/palestine-action.json"), page: abs(palestineActionTile.href), count: palestineAction.cases.length, description: "One chronological collection of case and campaign records, integrated source accounts, targeted corrections and explicit data-quality limitations. Includes actions before 7 October 2023. Not a verified list of convictions." },
    { id: "commentary", url: abs("/data/commentary.json"), page: abs("/research/"), count: commentary.length, description: "Labelled commentary, with anecdote provenance, dated figures, primary sources and explicit unknowns." },
    { id: "profiles", url: abs("/data/profiles.json"), page: abs("/research/"), count: profiles.length, description: "Selected public-record profiles and legal studies, with paragraph-level sources and explicit coverage limits; not a judges database." },
    { id: "research", url: abs("/data/research.json"), page: abs("/research/"), count: research.length, description: "Six historical research dossiers, with original annotations, provenance and explicit pending-verification status." },
    { id: "references", url: abs("/data/references.json"), count: references.length, description: "Primary and official sources cited across the site." },
    ...timelinesOut.map((t) => ({ id: t.id, url: abs(`/data/timelines/${t.id}.json`), page: t.url, count: t.sections.flatMap((s) => s.entries ?? []).length, description: t.description, genre: t.genre })),
    { id: "nuances", url: abs("/data/nuances.json"), page: abs("/nuances/"), count: nuances.length, description: "Legal nuances: rule, the point most people miss, and dated history with sources." },
    { id: "tribunals", url: abs("/data/tribunals.json"), page: abs("/independent-tribunals/"), count: tribunals.length, description: "People's and independent tribunals, documented from their own records and primary sources." },
    { id: "policies", url: abs("/data/policies.json"), count: policies.length, description: "Editorial, moderation, terrorism and privacy policies." },
  ],
  coverage: { entries: allEntries.length, entries_without_sources: unsourced, research_pending_review: research.map((r) => r.id) },
});

// Timeline page.
const template = await readFile(join(root, "templates", "uk-timeline.html"), "utf8");
const navigation = JSON.parse(await readFile(join(dataDir, "navigation.json"), "utf8"));
for (const t of timelines) {
  const siteHeader = renderSiteHeader({ navigation, path: t.path });
  const sourcesHtml = (ids) => ids.length
    ? `<ul class="sources"><li class="src-label">Sources</li>${ids.map((id) => {
        const r = refById.get(id);
        return `<li><a href="${escapeHtml(r.url)}" rel="noopener">${escapeHtml(r.title)}</a></li>`;
      }).join("")}</ul>`
    : "";
  const epi = refById.get(t.epigraph.source);
  const head = `<meta name="description" content="${escapeHtml(t.description)}">
<meta property="og:title" content="${escapeHtml(t.seo_title)}">
<meta property="og:description" content="${escapeHtml(t.og_description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${abs(t.path)}">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${abs(t.path)}">
<link rel="alternate" type="application/json" href="/data/timelines/${t.id}.json" title="${escapeHtml(t.title)} (JSON)">
<title>${escapeHtml(t.seo_title)}</title>`;
  const hero = `<header class="hero">
  <div class="wrap">
    <div class="kicker">${escapeHtml(t.kicker)}</div>
    <h1>${escapeHtml(t.title)}</h1>
    <p class="standfirst">${inline(t.standfirst)}</p>
    <p class="cumulative">${inline(t.cumulative)}</p>
    <blockquote class="epigraph">
      ${inline(t.epigraph.text)}
      <cite>— <a href="${escapeHtml(epi.url)}">${escapeHtml(epi.title)}</a>, ${escapeHtml(t.epigraph.cite.split(", ").pop())}</cite>
    </blockquote>
    <div class="hero-note">Scroll. The page darkens as the law tightens. ↓</div>
  </div>
</header>`;
  const usedKinds = new Set(allEntries.map((e) => e.kind));
  const chipLabels = { statute: "Statutes", sentence: "Sentences", event: "On the ground", pushback: "Courts push back", ruling: "Rulings" };
  const filters = `<nav class="filters" aria-label="Filter timeline entries">
  <div class="wrap">
    <button class="chip" aria-pressed="true" data-filter="all">All entries</button>
${Object.keys(t.kinds).filter((k) => usedKinds.has(k)).map((k) => `    <button class="chip" aria-pressed="false" data-filter="${k}">${escapeHtml(chipLabels[k] ?? t.kinds[k])}</button>`).join("\n")}
  </div>
</nav>`;
  const sections = t.sections.map((s) => {
    if (s.type === "explainer") {
      return `<section class="mechanism" id="${s.id}" data-era="${s.era}">
  <div class="wrap">
    <div class="mech-label">${escapeHtml(s.label)}</div>
    <h2>${escapeHtml(s.title)}</h2>
    <div class="mech-panel">
      <p class="mech-def">${inline(s.definition)}</p>
      <ul class="mech-tests">
${s.tests.map((x, i) => `        <li><span class="n">${i + 1}</span><span>${inline(x)}</span></li>`).join("\n")}
      </ul>
      <p class="mech-verdict">${inline(s.verdict)}</p>
      <p class="mech-note">${inline(s.note)}</p>
      ${sourcesHtml(s.sources)}
    </div>
  </div>
</section>`;
    }
    return `<section class="era" data-era="${s.era}">
  <div class="wrap">
    <div class="era-head">
      <div class="era-num">${escapeHtml(s.label)}</div>
      <h2>${escapeHtml(s.title)}</h2>
      <p class="era-sub">${inline(s.subtitle)}</p>
    </div>
    <div class="spine">
${s.entries.map((e) => `
      <article class="entry" id="${e.id}" data-kind="${e.kind}">
        <div class="date"><time datetime="${e.date}">${escapeHtml(e.date_label)}</time></div>
        <h3>${inline(e.title)}</h3>
        <p>${inline(e.body)}</p>
        <span class="tag">${escapeHtml(t.kinds[e.kind])}</span>
        ${sourcesHtml(e.sources)}
      </article>`).join("\n")}

    </div>
  </div>
</section>`;
  }).join("\n\n");
  await put(`${t.path.replace(/^\/|\/$/g, "")}/index.html`, template
    .replace("{{HEAD}}", head).replace("{{SITE_HEADER}}", siteHeader).replace("{{HERO}}", hero).replace("{{FILTERS}}", filters)
    .replace("{{SITE_FOOTER}}", renderSiteFooter({ navigation, site }))
    .replace("{{SECTIONS}}", sections).replace("{{BUILT}}", builtDay));
}

// Policy pages.
const legalPage = ({ title, description, path, body, updated, meta }) => `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${abs(path)}">
<link rel="icon" href="/favicon.svg">
<title>${escapeHtml(title)} — Independent Tribunal</title>
<style>
  :root { --navy:#10263e; --gold:#aa8237; --cream:#f5f7f9; --text:#162b40; --muted:#5b6978; --line:rgba(16,38,62,.15); }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--cream); color: var(--text); font: 17px/1.65 "Charter", "Iowan Old Style", Georgia, serif; }
  a { color: var(--navy); text-decoration-color: var(--gold); text-underline-offset: 3px; }
  a:hover { color: var(--gold); }
  main { width: min(46rem, calc(100% - 32px)); margin: 0 auto; }
  main { padding: 3rem 0 2rem; }
  .kicker { font: 800 11px/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .17em; text-transform: uppercase; color: #8a671f; }
  h1 { font: 500 clamp(2rem, 6vw, 3rem)/1.1 "Didot", "Bodoni MT", Georgia, serif; color: var(--navy); margin: .6rem 0 1rem; }
  h2 { font: 600 1.35rem/1.3 "Didot", "Bodoni MT", Georgia, serif; color: var(--navy); margin: 2.4rem 0 .6rem; }
  h3 { font-size: 1.1rem; margin: 1.6rem 0 .4rem; }
  .lede { color: var(--muted); font-size: 1.1rem; }
  .meta { font: 12px/1.5 ui-monospace, "SF Mono", Menlo, monospace; color: var(--muted); }
  li { margin: .35rem 0; }
  code { font: .9em ui-monospace, "SF Mono", Menlo, monospace; }
  .policy-list { list-style: none; padding: 0; }
  .policy-list li { padding: 1rem 0; border-top: 1px solid var(--line); }
  .policy-list a { font-weight: 600; }
  .rule { border-left: 3px solid var(--gold); padding: .2rem 0 .2rem 1.1rem; }
  .why { background: #efe8d8; padding: 1rem 1.2rem; }
  .history { list-style: none; padding: 0; border-left: 1px solid var(--line); margin-left: .3rem; }
  .history li { padding: 0 0 1.1rem 1.4rem; position: relative; }
  .history li::before { content: ""; position: absolute; left: -5px; top: .55rem; width: 9px; height: 9px; border-radius: 50%; background: var(--gold); }
  .history time { display: block; font: 12px/1.4 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .08em; color: var(--muted); }
  .src { font: 12px/1.5 ui-monospace, "SF Mono", Menlo, monospace; color: var(--muted); }
  .facts { display: grid; grid-template-columns: 9rem 1fr; gap: .5rem 1rem; margin: 1.5rem 0; padding: 1rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .facts dt { font: 700 11px/1.6 ui-sans-serif, system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  .facts dd { margin: 0; }
  @media (max-width: 560px) { .facts { grid-template-columns: 1fr; } .facts dd { margin-bottom: .6rem; } }
  .tags { display: flex; flex-wrap: wrap; gap: .4rem; padding: 0; list-style: none; }
  .tags a { font: 11px/1 ui-monospace, "SF Mono", Menlo, monospace; padding: .35rem .6rem; border: 1px solid var(--line); border-radius: 999px; text-decoration: none; }
  .attributed { font-size: .9rem; color: var(--muted); }
</style>
<link rel="stylesheet" href="/site-shell.css">
</head>
<body>
${renderSiteHeader({ navigation, path })}
<main id="main-content">
${body}
${meta ?? (updated ? `<p class="meta">Last updated ${escapeHtml(updated)} · <a href="/legal/${path.split("/")[2]}.md">Markdown source</a> · <a href="${site.source_repo}/commits/main/data/policies">change history</a></p>` : "")}
</main>
${renderSiteFooter({ navigation, site })}
</body>
</html>
`;

for (const p of policies) {
  await put(`legal/${p.slug}.md`, `# ${p.title}\n\n> ${p.summary}\n\nLast updated: ${p.updated}\n\n${p.body}`);
  await put(`legal/${p.slug}/index.html`, legalPage({
    title: p.title, description: p.summary, path: `/legal/${p.slug}/`, updated: p.updated,
    body: `<div class="kicker">Legal</div>\n<h1>${escapeHtml(p.title)}</h1>\n<p class="lede">${inline(p.summary)}</p>\n${markdown(p.body)}`,
  }));
}
await put("legal/index.html", legalPage({
  title: "Legal", description: "Independent Tribunal's editorial, moderation, terrorism and privacy policies.", path: "/legal/",
  body: `<div class="kicker">Independent Tribunal</div>
<h1>Legal</h1>
<p class="lede">How we analyse evidence from first principles, reference our claims, and make our reasoning open to scrutiny.</p>
<ul class="policy-list">${policies.map((p) => `<li><a href="/legal/${p.slug}/">${escapeHtml(p.title)}</a><br>${inline(p.summary)} <span class="meta">· updated ${escapeHtml(p.updated)}</span></li>`).join("")}</ul>`,
}));

// Nuance pages.
const srcLinks = (ids) => ids.length ? `<span class="src">Sources: ${ids.map((id) => `<a href="${escapeHtml(refById.get(id).url)}" rel="noopener">${escapeHtml(refById.get(id).title)}</a>`).join(" · ")}</span>` : "";
const nuanceMeta = (n) => `<p class="meta">Checked ${escapeHtml(n.checked)} · <a href="/data/nuances.json">JSON</a> · <a href="${site.source_repo}/blob/main/data/nuances/${n.id}.json">source file</a> · <a href="${site.source_repo}/commits/main/data/nuances/${n.id}.json">change history</a></p>`;
for (const n of nuancesOut) {
  const raw = nuances.find((x) => x.id === n.id);
  await put(`nuances/${n.id}/index.html`, legalPage({
    title: n.title, description: plain(n.summary), path: `/nuances/${n.id}/`, meta: nuanceMeta(n),
    body: `<div class="kicker">${escapeHtml(n.label)} · ${escapeHtml(n.jurisdiction)}</div>
<h1>${escapeHtml(n.title)}</h1>
<p class="lede">${inline(n.summary)}</p>
<h2 id="the-rule">The rule</h2>
<p class="rule">${inline(n.rule)}</p>
<h2 id="the-nuance">The nuance</h2>
${n.nuance.map((p) => `<p>${inline(p)}</p>`).join("\n")}
<h2 id="why-it-matters">Why it matters</h2>
<p class="why">${inline(n.why_it_matters)}</p>
<h2 id="history">History</h2>
<ol class="history">${raw.history.map((h) => `<li><time datetime="${h.date}">${escapeHtml(h.date_label)}</time>${inline(h.text)}<br>${srcLinks(h.sources ?? [])}</li>`).join("")}</ol>
<h2 id="sources">Primary sources</h2>
<ul>${raw.sources.map((id) => { const r = refById.get(id); return `<li><a href="${escapeHtml(r.url)}" rel="noopener">${escapeHtml(r.title)}</a> — ${escapeHtml(r.summary)}</li>`; }).join("")}</ul>
${n.related.timeline.length ? `<h2 id="in-the-timeline">In the timeline</h2><ul>${n.related.timeline.map((url) => { const id = url.split("#")[1]; const e = allEntries.find((x) => x.id === id); return `<li><a href="${new URL(url).pathname}#${id}">${e ? `${escapeHtml(e.date_label)} — ${inline(e.title)}` : "How it works"}</a></li>`; }).join("")}</ul>` : ""}
<p class="src">Not legal advice. Laws change; check the primary sources and speak to a lawyer about your own situation.</p>`,
  }));
}
await put("nuances/index.html", legalPage({
  title: "Legal nuances", description: "The points of law most people miss, with the dated history and primary sources behind each.", path: "/nuances/",
  meta: `<p class="meta">Also as <a href="/data/nuances.json">JSON</a> · <a href="/llms.txt">llms.txt</a></p>`,
  body: `<div class="kicker">Independent Tribunal · Legal affairs</div>
<h1>Legal nuances</h1>
<p class="lede">What the rule says, the point most people miss, and how it got that way. Every claim links to the primary record.</p>
<ul class="policy-list">${nuancesOut.map((n) => `<li><span class="src">${escapeHtml(n.label)}</span><br><a href="/nuances/${n.id}/">${escapeHtml(n.title)}</a><br>${inline(n.summary)}</li>`).join("")}</ul>`,
}));

// Tribunal pages.
const tagChips = (tags) => `<ul class="tags">${tags.map((t) => `<li><a href="/?tag=${encodeURIComponent(t)}">#${escapeHtml(t)}</a></li>`).join("")}</ul>`;
for (const t of tribunals) {
  const events = [...t.sat, ...(t.aftermath ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const related = (t.related_tribunals ?? []).map((id) => tribunals.find((x) => x.id === id));
  await put(`independent-tribunals/${t.id}/index.html`, legalPage({
    title: t.name, description: plain(t.summary), path: `/independent-tribunals/${t.id}/`,
    meta: `<p class="meta">Checked ${escapeHtml(t.checked)} · <a href="/data/tribunals.json">JSON</a> · <a href="${site.source_repo}/blob/main/data/tribunals/${t.id}.json">source file</a> · <a href="${site.source_repo}/commits/main/data/tribunals/${t.id}.json">change history</a></p>`,
    body: `<div class="kicker">Independent tribunals · ${escapeHtml(t.status)}</div>
<h1>${escapeHtml(t.name)}</h1>
<p class="lede">${inline(t.summary)}</p>
<dl class="facts">
<dt>Convened by</dt><dd>${inline(t.convened_by)}</dd>
${t.panel ? `<dt>Panel</dt><dd>${inline(t.panel)}</dd>` : ""}
<dt>Question</dt><dd>${inline(t.question)}</dd>
<dt>Legal status</dt><dd>${inline(t.legal_status)}</dd>
${t.website ? `<dt>Website</dt><dd><a href="${escapeHtml(t.website)}" rel="noopener">${escapeHtml(new URL(t.website).hostname)}</a></dd>` : ""}
</dl>
${tagChips(t.tags)}
<h2 id="findings">What it found</h2>
<p class="attributed">As stated by the tribunal itself. These are its findings, not a court's, and not ours.</p>
<ul>${t.findings.map((f) => `<li>${inline(f)}</li>`).join("")}</ul>
<h2 id="the-nuance">The nuance</h2>
${t.nuance.map((p) => `<p>${inline(p)}</p>`).join("\n")}
<h2 id="timeline">Timeline</h2>
<ol class="history">${events.map((h) => `<li><time datetime="${h.date}">${escapeHtml(h.date_label)}</time>${inline(h.text)}<br>${srcLinks(h.sources ?? [])}</li>`).join("")}</ol>
${(t.responses ?? []).length ? `<h2 id="responses">Responses</h2><ul>${t.responses.map((r) => `<li><strong>${escapeHtml(r.by)}</strong> (${escapeHtml(r.date_label)}): ${inline(r.text)} ${srcLinks(r.sources ?? [])}</li>`).join("")}</ul>` : ""}
${related.length ? `<h2 id="related">Related tribunals</h2><ul>${related.map((r) => `<li><a href="/independent-tribunals/${r.id}/">${escapeHtml(r.name)}</a> — ${inline(r.summary)}</li>`).join("")}</ul>` : ""}
<h2 id="sources">Primary sources</h2>
<ul>${t.sources.map((id) => { const r = refById.get(id); return `<li><a href="${escapeHtml(r.url)}" rel="noopener">${escapeHtml(r.title)}</a> — ${escapeHtml(r.summary)}</li>`; }).join("")}</ul>`,
  }));
}
await put("independent-tribunals/index.html", legalPage({
  title: "Independent tribunals", description: "People's and independent tribunals, documented from their own records: who convened them, what they asked, what they found, and their legal status.", path: "/independent-tribunals/",
  meta: `<p class="meta">Also as <a href="/data/tribunals.json">JSON</a> · <a href="/llms.txt">llms.txt</a></p>`,
  body: `<div class="kicker">Independent Tribunal · The record</div>
<h1>Independent tribunals</h1>
<p class="lede">When official institutions will not examine a question, citizens sometimes convene their own tribunal. They have no legal power. Their weight comes from evidence, openness and the people who sit on them. Several, including the Belmarsh and Gaza tribunals, trace their lineage to the Russell–Sartre Tribunal of 1966 on the Vietnam War.</p>
<p>Each record below sets out who convened the tribunal, what it asked, what it found, and its legal status. Findings are attributed to the tribunal and linked to its own published words.</p>
<ul class="policy-list">${tribunals.map((t) => `<li><span class="src">${escapeHtml(t.status)} · ${t.tags.map((x) => `#${escapeHtml(x)}`).join(" ")}</span><br><a href="/independent-tribunals/${t.id}/">${escapeHtml(t.name)}</a><br>${inline(t.summary)}</li>`).join("")}</ul>`,
}));

// Dated research imports, with provenance and status separate from verified references.
await publishResearch({ records: research, profiles, commentary, put, page: legalPage, escapeHtml, site });
await publishPalestineAction({ collection: palestineAction, records: research, put, page: legalPage, escapeHtml });
await publishProfiles({ profiles, put, page: legalPage, escapeHtml, site });
await publishCommentary({ commentary, put, page: legalPage, escapeHtml });
await publishForensics({ record: forensics, dataDir, put, page: legalPage, escapeHtml, site });

// Agent-facing text.
const llms = `# ${site.name}

> ${site.summary}

The Legal affairs section is a research hub: legislation, judgments and official publications, organised and linked, with commentary labelled as commentary. All data is published as JSON and regenerated on every push to ${site.source_repo}. Licence: ${site.license.name} (${site.license.applies_to}).

When citing, cite the primary source each entry links to (\`sources[].url\`). Facts that can change carry a \`checked\` date.

Public-record profiles are separately researched and are NOT judges-database entries or complete criminal records. Keep defendant/appellant cases distinct from contextual mentions in other judgments. Preserve paragraph-level source types and coverage limitations; reporting and self-description are not court findings. A source review date does not certify current custody or licence conditions.

Research dossiers are an exception: these are historical imports dated 2026-07-28, not verified current reports. Their \`migrated_on\` date is NOT a fact-check date. Preserve \`verification\`, \`review_note\`, corrections and source attribution when using them. Imported source annotations are commentary, including political labels.

Read any \`updates\` before the historical \`body_html\` or \`body_text\`: these are separately sourced developments with their own event and checked dates. An update supersedes conflicting historical claims only within its stated scope; it is not a full re-verification of the dossier. Follow \`related_updates\` to updates in the named dossier.

## Data

- [Sovereign AI document comparison](${abs("/data/forensics/sovereign-ai.json")}): supporting evidence with two PDF versions, nine grouped text edits, file metadata, hashes and source/archive links.
- [Commentary](${abs("/data/commentary.json")}): ${commentary.length} essays and research notes. Preserve satire labels, anecdote provenance, dated scopes and null (unknown) values; these are not findings of wrongdoing or medical assessments.
- [Data index](${abs("/data/index.json")}): every dataset, with counts and coverage
- [Public-record profiles](${abs("/data/profiles.json")}): ${profiles.length} selected profiles with paragraph-level sources resolved inline
- [Research dossiers](${abs("/data/research.json")}): ${research.length} historical imports with provenance, annotations and pending-verification status
- [References](${abs("/data/references.json")}): ${references.length} primary and official sources
- [Tribunals](${abs("/data/tribunals.json")}): ${tribunals.length} people's tribunals (findings attributed to each tribunal, legal status, primary sources)
- [Homepage tiles](${abs("/data/tiles.json")}): every tile on the homepage with tags
- [Nuances](${abs("/data/nuances.json")}): ${nuances.length} legal nuances (rule, nuance, history, sources resolved inline)
${timelinesOut.map((t) => `- [${t.title}](${abs(`/data/timelines/${t.id}.json`)}): ${t.description} (${t.genre}; sources resolved inline)`).join("\n")}

## Legal nuances

${nuancesOut.map((n) => `- [${n.title}](${n.url}): ${plain(n.summary)}`).join("\n")}

## Independent tribunals

${tribunalsOut.map((t) => `- [${t.name}](${t.url}): ${plain(t.summary)}`).join("\n")}

## Pages

- [forensics](${abs("/forensics/")}): document comparisons and reproducible evidence trails
- [Sovereign AI](${abs(forensicPath)}): supporting evidence — document differences and metadata; reviewed ${forensics.checked}
${commentaryOut.map((p) => `- [${p.title}](${p.url}): ${p.genre}; ${p.summary}`).join("\n")}
- [Research library](${abs("/research/")}): Independent Tribunal’s research dossiers and public-record profiles
- [People & public records](${abs("/people/")}): Individual profiles, proceedings, responses and source checks
- [Palestine Action collection](${abs(palestineActionTile.href)}): one chronological index of ${palestineAction.cases.length} records, including actions before 7 October 2023. Both inputs are unified, with additional details and seven lobbying accounts attached to the relevant records. A CAGE advocacy report is preserved separately. Only identified fields have received targeted corrections, not a full re-audit. Do not conflate unaffiliated actions with Palestine Action, arrests with convictions, or allegations with findings. [Unified JSON](${abs("/data/collections/palestine-action.json")}) preserves corrections, quality issues and record-level provenance; source dates are not current-status checks.
${profilesOut.map((p) => `- [${p.title}](${p.url}): ${p.subtitle}; sources reviewed ${p.checked}, selected coverage only`).join("\n")}
${researchOut.map((r) => `- [${r.title}](${r.url}): ${r.summary} (historical import; source date ${r.source_as_of}; current review pending)`).join("\n")}

${timelinesOut.map((t) => `- [${t.seo_title}](${t.url})`).join("\n")}
- [About](${abs("/about")}): origins of the idea and acknowledgements

## Policies

${policies.map((p) => `- [${p.title}](${abs(`/legal/${p.slug}.md`)}): ${p.summary}`).join("\n")}

## Optional

- [Everything as one text file](${abs("/llms-full.txt")})
- [Source repository](${site.source_repo})
`;
await put("llms.txt", llms);

const full = [
  forensicText(forensics, site),
  `# Palestine Action collection\n\n${abs(palestineActionTile.href)}\nOne unified chronological collection, including actions before 7 October 2023. Source accounts with targeted corrections, not a complete re-audit or a list of convictions. Download the structured collection, including integrated details, provenance, corrections, source dates, legal-status sources and data-quality flags: ${abs("/data/collections/palestine-action.json")}\n`,
  `# ${site.name} — full text\n\nGenerated ${built} from ${site.source_repo}. ${site.summary}\n`,
  ...profilesOut.map(profileText),
  ...commentaryOut.map(commentaryText),
  `\n## Historical research dossiers\n\nImported source narratives and annotations, not newly verified reporting. Political labels belong to the original author. Check primary records before relying on case-status claims.\n`,
  ...researchOut.map((r) => `\n### ${r.title}\n\nURL: ${r.url}\nSource date: ${r.source_as_of}. Migrated: ${r.migrated_on} (not a verification date). Status: ${r.verification}\n${r.review_note}\n\n${r.corrections.map((c) => `Correction (${c.date}): ${c.text} <${c.url}>`).join("\n")}\n\n${researchUpdatesText(r)}\n\nOriginal dossier (historical):\n${r.body_text}\n\n${r.supplementary ? `${r.supplementary.title}\n${r.supplementary.note}\n${researchText(r.supplementary.body_html)}` : ""}\n\nMaintained source: ${site.source_repo}/blob/main/data/research/${r.id}.json\nImported links (not all rechecked):\n${r.links.map((l) => `- ${l.label} <${l.url}>`).join("\n")}\n`),
  `\n## Independent tribunals\n\nFindings below are each tribunal's own, not a court's and not ours.\n`,
  ...tribunalsOut.map((t) => `\n### ${t.name}\n\nURL: ${t.url}\nStatus: ${t.status}. Tags: ${t.tags.join(", ")}. Checked: ${t.checked}\n\n${plain(t.summary)}\n\nConvened by: ${plain(t.convened_by)}\n${t.panel ? `Panel: ${plain(t.panel)}\n` : ""}Question: ${plain(t.question)}\nLegal status: ${plain(t.legal_status)}\n\nFindings (attributed to the tribunal):\n${t.findings.map((f) => `- ${plain(f)}`).join("\n")}\n\nNuance:\n${t.nuance.map((p) => `- ${plain(p)}`).join("\n")}\n\nTimeline:\n${[...t.sat, ...t.aftermath].sort((a, b) => a.date.localeCompare(b.date)).map((h) => `- ${h.date_label}: ${plain(h.text)}${h.sources.length ? ` [${h.sources.map((x) => x.url).join(", ")}]` : ""}`).join("\n")}\n\nSources: ${t.sources.map((x) => `${x.title} <${x.url}>`).join("; ")}\n`),
  `\n## Legal nuances\n`,
  ...nuancesOut.map((n) => `\n### ${n.title} (${n.label}; ${n.jurisdiction})\n\nURL: ${n.url}\nChecked: ${n.checked}\n\n${plain(n.summary)}\n\nThe rule: ${plain(n.rule)}\n\nThe nuance:\n${n.nuance.map((p) => `- ${plain(p)}`).join("\n")}\n\nWhy it matters: ${plain(n.why_it_matters)}\n\nHistory:\n${n.history.map((h) => `- ${h.date_label}: ${plain(h.text)}${h.sources.length ? ` [${h.sources.map((x) => x.url).join(", ")}]` : ""}`).join("\n")}\n\nSources: ${n.sources.map((x) => `${x.title} <${x.url}>`).join("; ")}\n`),
  ...timelines.map((t) => [
    `\n## ${t.seo_title}\n\nURL: ${abs(t.path)}\nGenre: ${t.genre}. ${t.note}\n\n${plain(t.standfirst)}\n`,
    ...t.sections.map((s) => s.type === "explainer"
      ? `\n### ${s.label}: ${s.title}\n\n${plain(s.definition)}\n${s.tests.map((x, i) => `${i + 1}. ${plain(x)}`).join("\n")}\n\n${plain(s.verdict)}\n\n${plain(s.note)}\nSources: ${s.sources.map((id) => refById.get(id).url).join(", ")}\n`
      : `\n### ${s.label}: ${s.title}\n\n${plain(s.subtitle)}\n` + s.entries.map((e) =>
          `\n#### ${e.date_label} — ${plain(e.title)} [${t.kinds[e.kind]}]\n\n${plain(e.body)}\n${e.sources.length ? `Sources: ${e.sources.map((id) => `${refById.get(id).title} <${refById.get(id).url}>`).join("; ")}` : "Sources: none yet (needs a primary source)"}\n`).join("")),
  ].join("")),
  `\n## References\n\n` + references.map((r) => `- ${r.title} (${r.publisher}, ${r.date}) <${r.url}> — ${r.summary} [checked ${r.checked}]`).join("\n") + "\n",
  ...policies.map((p) => `\n## Policy: ${p.title}\n\nURL: ${abs(`/legal/${p.slug}/`)}\nLast updated: ${p.updated}\n\n${p.body.replace(/^## /gm, "### ")}`),
].join("");
await put("llms-full.txt", full);

const pages = ["/", "/about", "/research/", "/people/", ...profiles.map((p) => `/research/${p.id}/`), ...research.map((r) => `/research/${r.id}/`), ...timelines.map((t) => t.path), "/nuances/", ...nuances.map((n) => `/nuances/${n.id}/`), "/independent-tribunals/", ...tribunals.map((t) => `/independent-tribunals/${t.id}/`), "/legal/", ...policies.map((p) => `/legal/${p.slug}/`)];
pages.push(...commentary.map((p) => `/research/${p.id}/`));
pages.push(palestineActionTile.href);
pages.push("/forensics/", forensicPath);
await put("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${abs(p)}</loc><lastmod>${builtDay}</lastmod></url>`).join("\n")}
</urlset>
`);
await put("robots.txt", `# Humans and AI agents welcome. Start at /llms.txt.
User-agent: *
Allow: /

Sitemap: ${abs("/sitemap.xml")}
`);

console.log(`✓ data: ${references.length} references, ${nuances.length} nuances, ${tribunals.length} tribunals, ${allEntries.length} timeline entries (${unsourced.length} still need a source), ${policies.length} policies → public/`);
