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
  if (p.pinned !== undefined && p.pinned !== true) fail("pinned must be true when set");
  if (p.artworks !== undefined && !Array.isArray(p.artworks)) fail("artworks must be an array");
  for (const image of [p.evidence_image, ...(p.artworks ?? [])].filter(Boolean)) {
    if (!/^\/images\/[a-z0-9-]+\.(png|jpg|webp)$/.test(image.src) || !image.alt?.trim() || !image.caption?.trim()) fail("evidence image requires a local image path, alt text and caption");
    if (![image.width, image.height].every((n) => Number.isInteger(n) && n > 0)) fail("evidence image requires positive integer dimensions");
  }
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
  const groupIds = new Set();
  for (const section of p.sections ?? []) {
    if (section.group !== undefined) {
      const g = section.group;
      if (!g || !safeId.test(g.id ?? "") || !g.title?.trim()) fail(`section ${section.id}: group requires a safe id and title`);
      if (!groupIds.has(g.id)) {
        addAnchor(g.id);
        groupIds.add(g.id);
      }
    }
    addAnchor(section.id);
    if (!section.title || !section.intro || !section.entries?.length) fail(`section ${section.id}: title, intro and entries required`);
    for (const entry of section.entries ?? []) {
      addAnchor(entry.id);
      if (!entry.title || !entry.kind || !entry.paragraphs?.length) fail(`entry ${entry.id}: title, kind and paragraphs required`);
      if (entry.table) {
        const { caption, columns, rows } = entry.table;
        if (!caption?.trim() || !Array.isArray(columns) || columns.length < 2 || !columns.every((c) => typeof c === "string" && c.trim()) || !Array.isArray(rows) || !rows.length || !rows.every((r) => Array.isArray(r) && r.length === columns.length && r.every((c) => typeof c === "string" && c.trim()))) fail(`entry ${entry.id}: table requires a caption, columns and matching nonempty rows`);
      }
      if (entry.date && !date.test(entry.date)) fail(`entry ${entry.id}: invalid date`);
      if (entry.video !== undefined) {
        const v = entry.video;
        if (v.provider !== "youtube") fail(`entry ${entry.id}: only YouTube embeds are supported`);
        if (!/^[A-Za-z0-9_-]{11}$/.test(v.id ?? "")) fail(`entry ${entry.id}: video id must be a YouTube video id`);
        if (!v.title?.trim()) fail(`entry ${entry.id}: video title required`);
        if (v.url !== `https://www.youtube.com/watch?v=${v.id}`) fail(`entry ${entry.id}: video url must be the canonical YouTube watch URL for that id`);
        if (v.channel !== undefined && !String(v.channel).trim()) fail(`entry ${entry.id}: video channel must be nonempty when set`);
      }
      for (const paragraph of entry.paragraphs ?? []) {
        if (!paragraph.text || !Array.isArray(paragraph.sources)) fail(`entry ${entry.id}: text and source array required`);
        if (paragraph.quote !== undefined && typeof paragraph.quote !== "boolean") fail(`entry ${entry.id}: quote must be boolean`);
        if (paragraph.quote && !paragraph.sources?.length) fail(`entry ${entry.id}: quotation requires a source`);
        if (paragraph.withheld !== undefined && paragraph.withheld !== true) fail(`entry ${entry.id}: withheld must be true when set`);
        if (paragraph.embargo !== undefined && paragraph.embargo !== true) fail(`entry ${entry.id}: embargo must be true when set`);
        if (paragraph.embargo && paragraph.withheld) fail(`entry ${entry.id}: a paragraph cannot be both embargoed and withheld`);
        if (paragraph.links !== undefined) {
          if (!Array.isArray(paragraph.links) || !paragraph.links.length) fail(`entry ${entry.id}: links must be a nonempty array when set`);
          const seen = new Set();
          for (const link of paragraph.links) {
            if (!link?.text || typeof link.text !== "string" || !link.text.trim()) fail(`entry ${entry.id}: each link needs visible text`);
            if (!paragraph.text.includes(link.text)) fail(`entry ${entry.id}: link text must appear in the paragraph`);
            if (!/^https:\/\//.test(link.url ?? "")) fail(`entry ${entry.id}: link url must be HTTPS`);
            if (seen.has(link.text)) fail(`entry ${entry.id}: duplicate link text`);
            seen.add(link.text);
          }
        }
        if (!paragraph.sources?.length && entry.kind !== "Research method" && entry.kind !== "Coverage limitation") fail(`entry ${entry.id}: factual paragraph requires sources`);
        for (const s of paragraph.sources ?? []) if (!sourceIds.has(s.id)) fail(`entry ${entry.id}: unknown source ${s.id}`);
      }
    }
  }
  for (const h of p.highlights ?? []) {
    if (!h.label || !h.value || !h.detail || !anchorIds.has(h.target)) fail("highlight requires text and an existing target");
  }
  if (p.featured_source && !sourceIds.has(p.featured_source)) fail("unknown featured source");
  if (p.evidence_image?.after_section && !p.sections.some((s) => s.id === p.evidence_image.after_section)) fail("evidence image placement requires an existing section");
  if (p.interactive !== undefined) {
    const i = p.interactive;
    if (!safeId.test(i.id ?? "") || anchorIds.has(i.id) || !/^\/[a-z0-9-]+\.js$/.test(i.script ?? "") || !i.fallback?.trim() || !p.sections.some((s) => s.id === i.after_section)) fail("interactive requires a safe unique id, a local script, fallback text and an existing section");
  }
  const entryIds = new Set((p.sections ?? []).flatMap((s) => (s.entries ?? []).map((e) => e.id)));
  for (const image of p.artworks ?? []) {
    const afterSection = image.after_section && p.sections.some((s) => s.id === image.after_section);
    const afterEntry = image.after_entry && entryIds.has(image.after_entry);
    if (image.after_section && image.after_entry) fail("artwork should use after_section or after_entry, not both");
    if (!afterSection && !afterEntry) fail("artwork placement requires an existing section or entry");
    if (!image.transcript?.trim()) fail("artwork requires a text transcript");
    if (image.content_warning !== undefined && !String(image.content_warning).trim()) fail("artwork content_warning must be nonempty when set");
  }
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
    ...(p.evidence_image ? [`Image: ${p.evidence_image.src}\n${p.evidence_image.alt}\n${p.evidence_image.caption}`] : []),
    ...(p.artworks ?? []).map((image) => `Artwork after ${image.after_entry || image.after_section}: ${image.src}\n${image.alt}\n${image.caption}\n${image.content_warning ? `Content warning: ${image.content_warning}\n` : ""}Text equivalent: ${image.transcript}`),
    ...p.highlights.map((h) => `${h.label}: ${h.value}. ${h.detail}.`),
    ...p.sections.map((section) => `### ${section.group && section.title !== section.group.title ? `${section.group.title} · ` : ""}${section.title}\n${section.intro}\n` + section.entries.map((entry) =>
      `#### ${entry.title}\n${entry.kind}${entry.date ? ` · ${entry.date}` : ""}${entry.citation ? ` · ${entry.citation}` : ""}\n` + (entry.video ? `Video: ${entry.video.title}${entry.video.channel ? ` · ${entry.video.channel}` : ""} <${entry.video.url}>\n` : "") + (entry.table ? `${entry.table.caption}\n${entry.table.rows.map((row) => row.map((cell, i) => `${entry.table.columns[i]}: ${cell}`).join(" · ")).join("\n")}\n\n` : "") + entry.paragraphs.map((para) => `${para.withheld ? "[Marked “This part is not published”. It is published: in law, words are published once a reader sees them.] " : ""}${para.embargo ? "[Not published until the case ends. This describes what is held back; the material itself is not on this site.] " : ""}${para.quote ? "> " : ""}${para.text}${para.links?.length ? "\n" + para.links.map((link) => `Link: ${link.text} <${link.url}>`).join("\n") : ""}\n${para.sources.map((ref) => {
        const s = sources.get(ref.id);
        return `Source: ${s.title} (${s.publisher}; ${s.type}; checked ${s.checked})${ref.locator ? `, ${ref.locator}` : ""} <${s.url}>`;
      }).join("\n")}`).join("\n\n")
    ).join("\n\n")),
    `Related:\n${(p.related?.length || p.research_links?.length ? [...(p.related ?? []), ...(p.research_links ?? [])].map((r) => `- ${r.title} <https://independenttribunal.org/research/${r.id}/>`) : ["- People & public records <https://independenttribunal.org/people/>", "- Research library <https://independenttribunal.org/research/>"]).join("\n")}`,
    ...(p.category === "legal-study" ? [`Satire clause. In the unlikely event that educating people about the law is itself found to break the law, everything on this page should be read as militarised satire. Get-out-of-jail-free statement: “You are so ugly because your mother was raped by a dog.” — Mars Robertson. (Mere vulgar abuse, addressed to no one. See the absurdity paradox <https://independenttribunal.org/research/absurdity-paradox/>.) This clause is tongue-in-cheek. It does not change the not-legal-advice notes on this page, and it is not aimed at any real person.`] : []),
  ].join("\n\n");
}

export async function publishProfiles({ profiles, put, page, escapeHtml: e, site }) {
  const people = profiles.filter((p) => p.category !== "legal-study");
  await put("people/index.html", page({
    title: "People & public records", path: "/people/",
    description: "Individual profiles grounded in documents: public work, legal proceedings, responses and unresolved questions.",
    body: `<p class="kicker">Independent Tribunal · Research category</p><h1>People &amp; public records</h1><p class="lede">The person. The claims. The record.</p><p>Public figures and individuals whose cases raise wider questions about law, power and accountability. Inclusion is not a judgment of character: an allegation is not a conviction, and a dismissal deserves the same prominence as a complaint.</p><ul class="policy-list">${people.map((p) => `<li><span class="kicker">${e(p.jurisdiction)}</span><h2><a href="/research/${p.id}/">${e(p.title)} →</a></h2><p>${e(p.summary)}</p><p class="meta">Sources reviewed ${e(p.checked)}</p></li>`).join("")}</ul><p><a href="/data/profiles.json">Download the profiles and legal studies JSON</a> · <a href="/research/">All research</a></p>`,
  }));
  for (const p of profiles) {
    const order = [...new Set(p.sections.flatMap((section) => section.entries.flatMap((entry) => entry.paragraphs.flatMap((para) => para.sources.map((ref) => ref.id)))))];
    const orderedSources = [...order.map((id) => p.sources.find((s) => s.id === id)), ...p.sources.filter((s) => !order.includes(s.id))];
    const sources = new Map(orderedSources.map((s, i) => [s.id, { ...s, number: i + 1 }]));
    const featured = sources.get(p.featured_source);
    const artworkMarkup = (image) => {
      const img = `<a href="${e(image.src)}" target="_blank" rel="noopener noreferrer" aria-label="Open image at full size (opens in a new tab)"><img src="${e(image.src)}" alt="${e(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy"></a>`;
      const media = image.content_warning
        ? `<p class="profile-content-warning-label">Content warning</p><details class="profile-content-warning"><summary>${e(image.content_warning)}</summary>${img}</details>`
        : img;
      return `<figure class="profile-evidence${image.content_warning ? " profile-sensitive" : ""}">${media}<figcaption>${e(image.caption)}</figcaption><details class="profile-transcript"><summary>Read the image text</summary><p>${e(image.transcript)}</p></details></figure>`;
    };
    const evidenceImage = p.evidence_image ? `<figure class="profile-evidence"><a href="${e(p.evidence_image.src)}" target="_blank" rel="noopener noreferrer" aria-label="Open image at full size (opens in a new tab)"><img src="${e(p.evidence_image.src)}" alt="${e(p.evidence_image.alt)}" width="${p.evidence_image.width}" height="${p.evidence_image.height}"></a><figcaption>${e(p.evidence_image.caption)}</figcaption></figure>` : "";
    const paragraphHtml = (para) => {
      const links = para.links ?? [];
      if (!links.length) return e(para.text);
      const hits = [];
      for (const link of links) {
        let from = 0;
        while (true) {
          const i = para.text.indexOf(link.text, from);
          if (i < 0) break;
          if (!hits.some((h) => !(i + link.text.length <= h.start || i >= h.end))) {
            hits.push({ start: i, end: i + link.text.length, text: link.text, url: link.url });
          }
          from = i + link.text.length;
        }
      }
      hits.sort((a, b) => a.start - b.start);
      let html = "";
      let cursor = 0;
      for (const h of hits) {
        html += e(para.text.slice(cursor, h.start));
        html += `<a href="${e(h.url)}" target="_blank" rel="noopener noreferrer">${e(h.text)}</a>`;
        cursor = h.end;
      }
      return html + e(para.text.slice(cursor));
    };
    const videoMarkup = (video) => {
      const src = `https://www.youtube-nocookie.com/embed/${e(video.id)}`;
      return `<div class="profile-video"><iframe src="${src}" title="${e(video.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe><p class="profile-video-fallback"><a href="${e(video.url)}" target="_blank" rel="noopener noreferrer">${e(video.title)}</a>${video.channel ? ` · ${e(video.channel)}` : ""}</p></div>`;
    };
    const citations = (refs) => refs.length ? `<span class="profile-citations">${refs.map((ref) => {
      const s = sources.get(ref.id);
      return `<a href="${e(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="Source ${s.number}: ${e(s.title)} (opens in a new tab)">[${s.number}] ${e(ref.locator ?? s.type)}</a>`;
    }).join(" · ")}</span>` : "";
    const embargo = (inner) => `<div class="profile-embargo" role="note"><p class="profile-embargo-label">Not published until the case ends</p>${inner}<p class="profile-embargo-note">This box says what we are holding back. The material itself is not on this site, not linked from it, and not described in a way that would help anyone find it.</p></div>`;
    const withheld = (inner) => `<div class="profile-withheld"><div class="profile-withheld-bounce" aria-hidden="true"><span class="profile-bounce-x"><span class="profile-bounce-y">🦩</span></span><span class="profile-bounce-x"><span class="profile-bounce-y">💩</span></span></div><p class="profile-withheld-label">This part is not published*</p><div class="profile-withheld-text">${inner}</div><p class="profile-withheld-note">*It is. In law, words are published the moment a reader sees them, and a label saying otherwise changes nothing. Read it as published, and as our honest opinion on the facts above.</p></div>`;
    const navItems = [];
    const seenGroups = new Set();
    for (const s of p.sections) {
      if (s.group && !seenGroups.has(s.group.id)) {
        seenGroups.add(s.group.id);
        navItems.push(`<a href="#${s.group.id}">${e(s.group.title)}</a>`);
      }
      if (!s.group || s.title !== s.group.title) navItems.push(`<a href="#${s.id}">${e(s.title)}</a>`);
    }
    const sectionBlock = (s, i) => {
      const prev = p.sections[i - 1];
      const startGroup = s.group && prev?.group?.id !== s.group.id;
      const groupHeading = startGroup ? `<header class="profile-group" id="${e(s.group.id)}"><h2>${e(s.group.title)}</h2></header>` : "";
      const heading = s.group && s.title === s.group.title ? "" : (s.group ? `<h3>${e(s.title)}</h3>` : `<h2>${e(s.title)}</h2>`);
      const entryTag = s.group ? "h4" : "h3";
      return `${groupHeading}<section class="profile-section${s.group ? " profile-section-grouped" : ""}" id="${s.id}">${heading}<p class="attributed">${e(s.intro)}</p>${s.entries.map((entry) => `<article class="profile-entry" id="${entry.id}"><p class="meta">${e(entry.kind)}${entry.date ? ` · <time datetime="${entry.date}">${e(entry.date)}</time>` : ""}</p><${entryTag}>${e(entry.title)}</${entryTag}>${entry.citation ? `<p><strong>${e(entry.citation)}</strong></p>` : ""}${entry.table ? `<div class="profile-table-wrap" role="region" aria-label="${e(entry.table.caption)}" tabindex="0"><table class="profile-table" role="table"><caption>${e(entry.table.caption)}</caption><thead role="rowgroup"><tr role="row">${entry.table.columns.map((c) => `<th scope="col" role="columnheader">${e(c)}</th>`).join("")}</tr></thead><tbody role="rowgroup">${entry.table.rows.map((row) => `<tr role="row">${row.map((cell, i) => i === 0 ? `<th scope="row" role="rowheader">${e(cell)}</th>` : `<td role="cell" data-label="${e(entry.table.columns[i])}">${e(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}${entry.paragraphs.map((para) => para.embargo ? embargo(`<p>${paragraphHtml(para)}</p>${citations(para.sources)}`) : para.withheld ? withheld(`<p>${paragraphHtml(para)}</p>${citations(para.sources)}`) : `${para.quote ? `<blockquote class="profile-quotation" cite="${e(sources.get(para.sources[0].id).url)}"><p>${paragraphHtml(para)}</p></blockquote>` : `<p>${paragraphHtml(para)}</p>`}${citations(para.sources)}`).join("")}${entry.video ? videoMarkup(entry.video) : ""}</article>${(p.artworks ?? []).filter((image) => image.after_entry === entry.id).map(artworkMarkup).join("")}`).join("")}${p.evidence_image?.after_section === s.id ? evidenceImage : ""}${(p.artworks ?? []).filter((image) => image.after_section === s.id).map(artworkMarkup).join("")}${p.interactive?.after_section === s.id ? `<div class="profile-interactive" id="${p.interactive.id}"><p>${e(p.interactive.fallback)}</p></div><script src="${p.interactive.script}" defer></script>` : ""}</section>`;
    };
    await put(`research/${p.id}/index.html`, page({
      title: p.title, description: p.summary, path: `/research/${p.id}/`,
      image: p.evidence_image && !p.evidence_image.after_section ? p.evidence_image : (p.evidence_image || (p.artworks ?? []).find((image) => image.og) || undefined),
      meta: `<p class="meta">Sources reviewed ${e(p.checked)} · <a href="/data/profiles/${p.id}.json">Download JSON</a> · <a href="${site.source_repo}/commits/main/data/profiles/${p.id}.json">Edit history</a></p>`,
      body: `<style>
        .profile-hero { border-top:4px solid var(--navy); padding-top:1.6rem; }
        .profile-evidence { margin:1.5rem 0; }
        .profile-evidence img { display:block; width:100%; height:auto; border:1px solid var(--line); }
        .profile-evidence figcaption { margin-top:.65rem; color:var(--muted); font:12px/1.6 ui-sans-serif,system-ui,sans-serif; }
        .profile-content-warning-label { margin:0 0 .45rem; font:700 12px/1.5 ui-sans-serif,system-ui,sans-serif; letter-spacing:.06em; text-transform:uppercase; }
        .profile-content-warning { margin:0 0 .65rem; padding:.8rem 1rem; border:2px solid var(--navy); background:#eee8da; font:14px/1.65 ui-sans-serif,system-ui,sans-serif; }
        .profile-content-warning summary { cursor:pointer; font-weight:700; }
        .profile-content-warning img { margin-top:.8rem; }
        .profile-transcript { margin-top:.75rem; padding:.8rem 1rem; border:1px solid var(--line); font:14px/1.65 ui-sans-serif,system-ui,sans-serif; }
        .profile-transcript summary { cursor:pointer; font-weight:600; }
        .profile-transcript p { white-space:pre-line; }
        .profile-embargo { margin:1.2rem 0; padding:1rem 1.2rem; border:2px solid var(--navy); }
        .profile-embargo-label { margin:0 0 .6rem; font:700 12px/1.5 ui-sans-serif,system-ui,sans-serif; letter-spacing:.06em; text-transform:uppercase; }
        .profile-embargo-note { margin:.6rem 0 0; font:12px/1.5 ui-sans-serif,system-ui,sans-serif; color:var(--muted); }
        .profile-withheld { position:relative; overflow:hidden; margin:1.2rem 0; padding:1rem 1.2rem; border:1px dashed var(--muted); }
        .profile-withheld-bounce, .profile-bounce-x { position:absolute; top:0; bottom:0; }
        .profile-withheld-bounce { left:0; right:0; pointer-events:none; }
        .profile-bounce-x { width:2.4rem; animation:profile-bounce-x 7.3s linear infinite alternate; }
        .profile-bounce-y { position:absolute; left:0; font-size:2rem; line-height:1; animation:profile-bounce-y 4.1s linear infinite alternate; }
        .profile-bounce-x + .profile-bounce-x { animation-duration:5.9s; animation-delay:-2s; }
        .profile-bounce-x + .profile-bounce-x .profile-bounce-y { animation-duration:3.3s; animation-delay:-1s; }
        @keyframes profile-bounce-x { from { left:0; } to { left:calc(100% - 2.4rem); } }
        @keyframes profile-bounce-y { from { top:0; } to { top:calc(100% - 2rem); } }
        @media(prefers-reduced-motion:reduce) { .profile-bounce-x, .profile-bounce-y { animation:none; } }
        .profile-withheld-label { position:relative; margin:0 0 .6rem; font:700 12px/1.5 ui-sans-serif,system-ui,sans-serif; letter-spacing:.06em; text-transform:uppercase; }
        .profile-withheld-text { position:relative; opacity:.25; }
        .profile-withheld-note { position:relative; margin:.6rem 0 0; font:12px/1.5 ui-sans-serif,system-ui,sans-serif; color:var(--muted); }
        .profile-scope { border-left:3px solid var(--gold); padding:.8rem 1.2rem; background:#eee8da; font-size:.95rem; }
        .profile-status { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; margin:1.7rem 0; }
        .profile-status a { display:flex; flex-direction:column; gap:.7rem; padding:1rem; border:1px solid var(--line); background:white; text-decoration:none; }
        .profile-status small { font:600 11px/1.5 ui-sans-serif,system-ui,sans-serif; color:var(--muted); }
        .profile-status strong { font-size:1.2rem; line-height:1.3; }
        .profile-nav { display:flex; flex-wrap:wrap; gap:.5rem 1rem; padding:1rem 0; border-block:1px solid var(--line); font:600 13px/1.6 ui-sans-serif,system-ui,sans-serif; }
        .profile-group { margin-top:3.2rem; padding-top:1.2rem; border-top:4px solid var(--navy); scroll-margin-top:1.5rem; }
        .profile-group + .profile-section-grouped + .profile-group,
        .profile-section-grouped ~ .profile-group { margin-top:4.5rem; padding-top:2rem; border-top:4px solid var(--navy); }
        .profile-group h2 { margin:0; }
        .profile-section { scroll-margin-top:1.5rem; margin-top:3rem; }
        .profile-section-grouped { margin-top:2rem; }
        .profile-section-grouped > h3 { margin-top:0; }
        .profile-entry { border-top:1px solid var(--line); padding-top:1rem; margin-top:1.5rem; scroll-margin-top:1.5rem; }
        .profile-entry h3, .profile-entry h4 { margin-top:.6rem; }
        .profile-entry .meta { font-size:11px; }
        .profile-quotation { margin:1.25rem 0; padding:1rem 1.25rem; border-left:3px solid var(--gold); background:#eee8da; }
        .profile-quotation p { margin:0; }
        .profile-video { margin:1.25rem 0; max-width:40rem; }
        .profile-video iframe { display:block; width:100%; aspect-ratio:16 / 9; height:auto; border:0; background:#111; }
        .profile-video-fallback { margin:.65rem 0 0; font:12px/1.6 ui-sans-serif,system-ui,sans-serif; }
        .profile-table-wrap { overflow-x:auto; margin:1rem 0; }
        .profile-table { width:100%; min-width:34rem; border-collapse:collapse; font-size:.95rem; }
        .profile-table caption { text-align:left; margin-bottom:.7rem; font-weight:600; }
        .profile-table th,.profile-table td { text-align:left; vertical-align:top; border-bottom:1px solid var(--line); padding:.8rem; }
        .profile-table thead { background:var(--navy); color:white; }
        .profile-table tbody th { width:25%; }
        .profile-citations { display:block; font:12px/1.6 ui-sans-serif,system-ui,sans-serif; margin:.4rem 0 1.3rem; color:var(--muted); }
        .profile-sources { padding-left:1.5rem; font-size:.95rem; }
        .profile-sources li { margin-bottom:1rem; overflow-wrap:anywhere; }
        .profile-sources small { display:block; color:var(--muted); font:12px/1.6 ui-sans-serif,system-ui,sans-serif; }
        a:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
        @media(max-width:560px) { .profile-status { grid-template-columns:1fr; } }
        @media(max-width:640px) {
          .profile-table { min-width:0; }
          .profile-table, .profile-table caption, .profile-table tbody, .profile-table tr, .profile-table th, .profile-table td { display:block; width:auto; }
          .profile-table thead { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
          .profile-table tbody tr { border-bottom:1px solid var(--line); padding:.75rem 0; }
          .profile-table tbody th { width:auto; border:0; padding:0 0 .35rem; }
          .profile-table td { border:0; padding:.35rem 0; }
          .profile-table td::before { content:attr(data-label); display:block; font:600 11px/1.5 ui-sans-serif,system-ui,sans-serif; color:var(--muted); letter-spacing:.03em; text-transform:uppercase; }
        }
        .profile-related { margin:2.2rem 0 1.2rem; padding-top:1.4rem; border-top:1px solid var(--line); }
        .profile-related h2 { margin-top:0; }
        .profile-related ul { margin:.4rem 0 0; padding:0; list-style:none; }
        .profile-related li { margin:0; border-bottom:1px solid var(--line); }
        .profile-related a { display:block; padding:.7rem 0; text-decoration:none; }
        .profile-satire { margin:2.4rem 0 0; padding:1.1rem 1.2rem; border:1px dashed var(--muted); }
        .profile-satire-label { margin:0 0 .6rem; font:700 12px/1.5 ui-sans-serif,system-ui,sans-serif; letter-spacing:.06em; text-transform:uppercase; }
        .profile-satire p { margin:0 0 .7rem; }
        .profile-satire p:last-child { margin-bottom:0; color:var(--muted); font:14px/1.65 ui-sans-serif,system-ui,sans-serif; }
        @media print { .profile-nav,.contact { display:none; } }
      </style>
      <div class="profile-hero"><a href="/research/" class="kicker">Independent Tribunal · Research</a><h1>${e(p.title)}</h1><p class="lede">${e(p.subtitle)}</p>${p.evidence_image?.after_section ? "" : evidenceImage}<p>${e(p.summary)}</p><p class="meta">${e(p.jurisdiction)} · Sources reviewed <time datetime="${p.checked}">${e(p.checked)}</time></p></div>
      ${p.category !== "legal-study" ? '<p><a href="/people/">People &amp; public records →</a></p>' : ""}
      <aside class="profile-scope">${e(p.scope)}</aside>
      <div class="profile-status">${p.highlights.map((h) => `<a href="#${h.target}"><small>${e(h.label)}</small><strong>${e(h.value)}</strong><small>${e(h.detail)}</small></a>`).join("")}</div>
      <p class="attributed">${e(p.status_note)}</p>
      ${featured ? `<p><a href="${e(featured.url)}" target="_blank" rel="noopener noreferrer">Read the report from ${e(featured.publisher)} ↗</a> <span class="meta">(opens in a new tab)</span></p>` : ""}
      <nav class="profile-nav" aria-label="On this page">${navItems.join("")}<a href="#sources">Source register</a><a href="#related">Related</a>${p.category === "legal-study" ? '<a href="#satire-clause">Satire clause</a>' : ""}</nav>
      ${p.sections.map(sectionBlock).join("")}
      <section class="profile-section" id="sources"><h2>Source register</h2><p>Sources are numbered in order of first citation; repeated citations keep their number. Source links open in a new tab. A source’s type matters: a campaign statement or personal account is not a judgment. The review date records this page’s source check, not a guarantee of completeness.</p><ol class="profile-sources">${orderedSources.map((s) => `<li id="source-${s.id}"><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a><small>${e(s.publisher)} · ${e(s.type)}${s.date ? ` · ${e(s.date)}` : ""}<br>Checked ${e(s.checked)}</small></li>`).join("")}</ol></section>
      <section class="profile-related" id="related"><h2>Related</h2><ul>${p.related?.length || p.research_links?.length ? [...(p.related ?? []), ...(p.research_links ?? [])].map((r) => `<li><a href="/research/${r.id}/">${e(r.title)}</a></li>`).join("") : '<li><a href="/people/">People &amp; public records</a></li><li><a href="/research/">Research library</a></li>'}</ul></section>
      <p><a href="${site.source_repo}/blob/main/data/profiles/${p.id}.json">View the maintained source</a> · <a href="${site.contact.issues}">Submit a source or correction</a>. Do not post private case material publicly.</p>
      ${p.category === "legal-study" ? `<aside class="profile-satire" id="satire-clause" role="note"><p class="profile-satire-label">Satire clause</p><p>In the unlikely event that educating people about the law is itself found to break the law, everything on this page should be read as militarised satire. Get-out-of-jail-free statement: “You are so ugly because your mother was raped by a dog.” — Mars Robertson. (Mere vulgar abuse, addressed to no one. See the <a href="/research/absurdity-paradox/">absurdity paradox</a>.)</p><p>This clause is tongue-in-cheek. It does not change the not-legal-advice notes on this page, and it is not aimed at any real person.</p></aside>` : ""}`,
    }));
  }
}
