import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export function validateCommentary(p, fail) {
  if (!/^[a-z0-9-]+$/.test(p.id)) fail("unsafe id");
  for (const key of ["title", "headline", "summary", "scope", "genre"]) if (!p[key]) fail(`missing ${key}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.checked)) fail("checked date required");
  if (!/^\/images\/[a-z0-9/-]+\.png$/.test(p.image?.src) || !p.image?.alt || !p.image?.caption || !p.image?.transcript || !p.image?.rights) fail("image requires safe path and context");
  if (!(p.image?.width > 0 && p.image?.height > 0)) fail("image dimensions required");
  const ids = new Set();
  for (const s of p.sources ?? []) {
    if (!Number.isInteger(s.number) || ids.has(s.number)) fail("unique source numbers required");
    ids.add(s.number);
    if (!/^https:\/\//.test(s.url) || !s.title || !s.type || s.checked !== p.checked) fail("source metadata required");
  }
  for (const key of ["sources", "scale_figures", "legal_context", "first_principles", "questions", "reading_rules", "editorial_argument", "alternative_explanations_to_test"]) {
    if (!Array.isArray(p[key]) || !p[key].length) fail(`${key} required`);
  }
  for (const item of [...(p.scale_figures ?? []), ...(p.legal_context ?? [])]) {
    if (!item.source_numbers?.length) fail("factual item requires sources");
    for (const id of item.source_numbers ?? []) if (!ids.has(id)) fail(`unknown source ${id}`);
  }
  for (const f of p.scale_figures ?? []) if (!f.label || !f.period || !f.scope || !Number.isFinite(f.value)) fail("figure needs value, date and scope");
  for (const [key, value] of Object.entries(p.unknowns ?? {})) if (value !== null || !p.unknown_labels?.[key]) fail("unknowns must remain labelled nulls");
  if (!p.evidence_frame?.provenance || !p.evidence_frame?.interpretation) fail("anecdote provenance required");
}

export async function loadCommentary(dataDir, fail) {
  const result = [];
  for (const file of (await readdir(join(dataDir, "commentary"))).filter((f) => f.endsWith(".json"))) {
    const p = JSON.parse(await readFile(join(dataDir, "commentary", file), "utf8"));
    validateCommentary(p, (message) => fail(`commentary/${file}`, message));
    if (file !== `${p.id}.json`) fail(`commentary/${file}`, "file name must match id");
    result.push(p);
  }
  return result;
}

export function commentaryText(p) {
  return `## ${p.title}\nURL: ${p.url}\nGenre: ${p.genre}\n${p.headline}\n${p.scope}\n\n` +
    // Preserve the complete evidence frame, caveats, nulls and source map in the text export.
    JSON.stringify(p, null, 2);
}

export async function publishCommentary({ commentary, put, page, escapeHtml: e }) {
  for (const p of commentary) {
    const sources = new Map(p.sources.map((s) => [s.number, s]));
    const refs = (ids) => `<span class="src">${ids.map((id) => `<a href="${e(sources.get(id).url)}" aria-label="Source ${id}: ${e(sources.get(id).title)}">[${id}]</a>`).join(" · ")}</span>`;
    const list = (items) => `<ul>${items.map((x) => `<li>${e(x)}</li>`).join("")}</ul>`;
    const sections = [["the-paradox", "The paradox"], ["starting-point", "Starting point"], ["the-scale", "The scale"], ["law-and-accountability", "Law and accountability"], ["questions", "Questions to test"], ["sources", "Sources"]];
    await put(`research/${p.id}/index.html`, page({
      title: p.title, description: p.summary, path: `/research/${p.id}/`,
      meta: `<p class="meta">Author’s note: ${e(p.created_on)} · Cited releases checked: ${e(p.checked)}<br><a href="/data/commentary/${p.id}.json">Download the research note as JSON</a></p>`,
      body: `<style>
        .essay-hero { border-top:4px solid var(--navy); padding-top:1.6rem; }
        .essay-headline { font-size:clamp(1.5rem,4vw,2.1rem); line-height:1.3; max-width:32ch; margin:1.6rem 0; }
        .essay-notice { border-left:3px solid var(--gold); padding:1rem 1.2rem; background:#eee8da; font-size:.95rem; }
        .essay-art { margin:2rem 0; }
        .essay-art img { display:block; width:100%; height:auto; border:1px solid var(--line); }
        .essay-art figcaption { padding:.85rem 0; font:13px/1.6 ui-sans-serif,system-ui,sans-serif; color:var(--muted); }
        .essay-nav { display:flex; flex-wrap:wrap; gap:.6rem 1.1rem; border-block:1px solid var(--line); padding:1rem 0; font:600 13px/1.6 ui-sans-serif,system-ui,sans-serif; }
        .essay-section { scroll-margin-top:1.5rem; margin-top:3rem; }
        .essay-table-wrap { overflow-x:auto; }
        .essay-table { width:100%; border-collapse:collapse; font-size:.92rem; }
        .essay-table caption { text-align:left; padding:1rem 0; color:var(--muted); }
        .essay-table th,.essay-table td { text-align:left; vertical-align:top; border-bottom:1px solid var(--line); padding:1rem .7rem; }
        .essay-table th[scope="row"] { width:38%; font-weight:500; }
        .essay-table strong { display:block; font-size:1.1rem; color:var(--navy); }
        .essay-table small { display:block; margin-top:.3rem; }
        .essay-sources { overflow-wrap:anywhere; }
        .essay-sources li { margin-bottom:1rem; }
        .essay-sources small { display:block; color:var(--muted); }
        .essay-unknowns { padding-left:1.2rem; }
        details { border-block:1px solid var(--line); padding:.8rem 0; }
        summary { cursor:pointer; font:600 13px/1.6 ui-sans-serif,system-ui,sans-serif; }
        a:focus-visible,summary:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
        @media(max-width:480px) { .essay-table th,.essay-table td { padding:.8rem .35rem; } }
        @media print { .essay-nav,.contact { display:none; } }
      </style>
      <div class="essay-hero"><a class="kicker" href="/research/">Independent Tribunal · Commentary</a><h1>${e(p.title)}</h1><p class="essay-headline">${e(p.headline)}</p><p class="lede">${e(p.summary)}</p><p class="meta">${e(p.genre)} · ${e(p.checked)}</p></div>
      <aside class="essay-notice">${e(p.scope)}<p><strong>Satire, not an NHS notice.</strong> The artwork below is not official guidance. Claiming support you genuinely qualify for is not exploitation; this page does not encourage false claims.</p></aside>
      <figure class="essay-art"><img src="${e(p.image.src)}" width="${p.image.width}" height="${p.image.height}" alt="${e(p.image.alt)}" aria-describedby="artwork-caption"><figcaption id="artwork-caption">${e(p.image.caption)}</figcaption></figure>
      <details><summary>Read the artwork’s text (satire)</summary><p>${e(p.image.transcript)}</p><p class="attributed">${e(p.image.rights)}</p></details>
      <nav class="essay-nav" aria-label="On this page">${sections.map(([id,title]) => `<a href="#${id}">${e(title)}</a>`).join("")}</nav>
      <section class="essay-section" id="the-paradox"><h2>The inverse Catch-22</h2><p class="meta">Editorial argument</p>${p.editorial_argument.map((x) => `<p>${e(x)}</p>`).join("")}</section>
      <section class="essay-section" id="starting-point"><h2>Critical thinking from first principles</h2><p>${e(p.subtitle)}</p><blockquote class="rule"><p>${e(p.evidence_frame.personal_account)}</p></blockquote><p class="attributed">${e(p.evidence_frame.provenance)} Number of accounts: not supplied. ${e(p.evidence_frame.independence)}</p><p>${e(p.evidence_frame.interpretation)}</p><h3>Start with distinctions</h3>${list(p.first_principles)}</section>
      <section class="essay-section" id="the-scale"><h2>The scale—and what the numbers cannot tell us</h2><p>${e(p.purpose)}</p><aside class="essay-notice">These groups overlap. Do not add them together or treat them as slices of one population. None of these figures is a measure of fraud or complicity.</aside>
      <div class="essay-table-wrap"><table class="essay-table"><caption>Dated figures from the supplied research note; sources checked ${e(p.checked)}. Not a latest-release dashboard.</caption><thead><tr><th scope="col">Measure and figure</th><th scope="col">Period, scope and source</th></tr></thead><tbody>${p.scale_figures.map((f) => `<tr><th scope="row">${e(f.label)}<strong>${e(f.display ?? `${f.value}%`)}</strong></th><td>${e(f.period)}<small>${e(f.scope)}</small>${f.calculation ? `<small>Calculation: ${e(f.calculation)}</small>` : ""}${refs(f.source_numbers)}</td></tr>`).join("")}</tbody></table></div>
      <h3>How to read these figures</h3>${list(p.reading_rules)}</section>
      <section class="essay-section" id="law-and-accountability"><h2>Law, entitlement and accountability</h2>${p.legal_context.map((x) => `<h3>${e(x.title)}</h3><p>${e(x.text)} ${refs(x.source_numbers)}</p>`).join("")}</section>
      <section class="essay-section" id="questions"><h2>Exploiting the benefits system?</h2><p class="meta">A hypothesis to test—not a finding</p><p class="rule">${e(p.hypothesis_to_test)}</p><h3>Alternative explanations to test</h3>${list(p.alternative_explanations_to_test)}<h3>What would we need to know?</h3>${list(p.questions)}<h3>Still unknown</h3><ul class="essay-unknowns">${Object.keys(p.unknowns).map((key) => `<li>${e(p.unknown_labels[key])}: <strong>unknown</strong>.</li>`).join("")}</ul><p>Unknown is not zero. The figures above do not supply these answers. Investigating institutional incentives should not become a presumption against people with mental-health conditions or disabilities.</p></section>
      <section class="essay-section" id="sources"><h2>Sources and provenance</h2><p>The personal account and artwork were supplied by the author. Neither is independent evidence of benefit misuse. The figures link to the dated official releases below; the legal context links to official guidance. No private individuals are identified.</p><ul class="essay-sources">${p.sources.map((s) => `<li id="source-${s.number}">[${s.number}] <a href="${e(s.url)}">${e(s.title)}</a><small>${e(s.type)} · checked ${e(s.checked)}</small></li>`).join("")}</ul></section>
      <p><a href="/research/">Back to the research library</a> · <a href="/legal/editorial-standards/">Editorial standards</a></p>`,
    }));
  }
}
