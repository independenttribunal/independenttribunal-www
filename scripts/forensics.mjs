import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

export const forensicPath = "/forensics/sovereign-ai/";
export const normalizeExtract = (text) => text.replace(/\s+/g, " ").trim();

export async function loadForensics(dataDir) {
  const dir = join(dataDir, "forensics", "sovereign-ai");
  const record = JSON.parse(await readFile(join(dir, "record.json"), "utf8"));
  if (record.id !== "sovereign-ai" || !/^\d{4}-\d{2}-\d{2}$/.test(record.checked)) throw new Error("Invalid forensic record identity/date");
  if (record.versions.length !== 2 || record.changes.length !== 9) throw new Error("Expected two versions and nine grouped edits");
  const pages = [];
  for (const v of record.versions) {
    if (!/^guidance-v[12]\.pdf$/.test(v.file) || v.text_file !== v.file.replace(/pdf$/, "txt")) throw new Error("Unsafe forensic source path");
    const bytes = await readFile(join(dir, v.file));
    if (bytes.length !== v.bytes || createHash("sha256").update(bytes).digest("hex") !== v.sha256) throw new Error(`Evidence hash mismatch: ${v.id}`);
    pages.push((await readFile(join(dir, v.text_file), "utf8")).split("\f").slice(0, v.pages).map(normalizeExtract));
    if (pages.at(-1).length !== v.pages) throw new Error(`Evidence page count mismatch: ${v.id}`);
  }
  for (const url of [...Object.values(record.links), ...record.versions.flatMap((v) => [v.url, v.archive_url])]) {
    if (new URL(url).protocol !== "https:") throw new Error("Forensic links require HTTPS");
  }
  const ids = new Set();
  const checkExcerpt = (text, version, page) => {
    if (!pages[version][page - 1]?.includes(normalizeExtract(text))) throw new Error(`Excerpt absent from ${record.versions[version].id} page ${page}: ${text}`);
  };
  for (const c of record.changes) {
    if (!/^c\d{2}$/.test(c.id) || ids.has(c.id) || !c.title || !c.kind || !c.analysis) throw new Error("Invalid forensic change");
    ids.add(c.id);
    if (c.before) checkExcerpt(c.before, 0, c.pages[0]);
    for (const excerpt of c.after.split("\n")) checkExcerpt(excerpt, 1, c.pages[1]);
  }
  for (const p of record.unchanged_passages) for (let v = 0; v < 2; v++) checkExcerpt(p.text, v, p.pages[v]);
  return record;
}

export function forensicTile(r) {
  return {kind:"forensics", id:r.id, title:r.title, label:r.subtitle, summary:r.summary, tags:["uk", "forensics", "ai", "foi", "procurement"], href:forensicPath, uk:true};
}

export function forensicText(r, site) {
  return `## ${r.title}: ${r.subtitle}\nURL: ${site.url}${forensicPath}\nChecked: ${r.checked}\n${r.scope}\n${r.provenance}\n` +
    Object.entries(r.links).map(([label,url]) => `${label}: ${url}`).join("\n") + "\n\n" +
    r.versions.map((v) => `${v.id}: ${v.pages} pages; PDF creation metadata ${v.created}; SHA-256 ${v.sha256}\nOriginal: ${v.url}\nArchive: ${v.archive_url}\n${v.verification}`).join("\n\n") + "\n\n" +
    r.findings.map((f) => `${f.title}: ${f.text}`).join("\n\n") + "\n\n" +
    r.unchanged_passages.map((p) => `${p.title} (V1 p${p.pages[0]}, V2 p${p.pages[1]}): ${p.text}`).join("\n\n") + "\n\n" +
    r.changes.map((c) => `${c.id}: ${c.title} (${c.kind}; V1 p${c.pages[0]}, V2 p${c.pages[1]})\nBefore: ${c.before ?? "No corresponding item in this section"}\nAfter: ${c.after}\nInterpretation: ${c.analysis}`).join("\n\n") + "\n\n" +
    r.foi_context.join("\n\n") + `\n\nFollow-up FOI: ${r.draft_foi.status}\n${r.draft_foi.intro}\n` + r.draft_foi.items.map((q,i) => `${i+1}. ${q}`).join("\n") + `\n${r.draft_foi.closing}\n\nMethod and limitations:\n` + r.method.join("\n\n");
}

export async function publishForensics({record:r, dataDir, put, page, escapeHtml:e, site}) {
  const link = (url, label) => `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`;
  const pdfLinks = (pages) => r.versions.map((v,i) => link(`${v.url}#page=${pages[i]}`, `${v.id} p${pages[i]}`)).join(" · ");
  for (const v of r.versions) {
    await put(`forensics/sovereign-ai/${v.file}`, await readFile(join(dataDir, "forensics", r.id, v.file)));
    await put(`forensics/sovereign-ai/${v.text_file}`, await readFile(join(dataDir, "forensics", r.id, v.text_file), "utf8"));
  }
  await put("data/forensics/sovereign-ai.json", {...r, url:`${site.url}${forensicPath}`});
  await put("forensics/index.html", page({title:"forensics", path:"/forensics/", description:"Document comparisons and reproducible evidence trails supporting public-interest questions.", body:`<p class="kicker">Independent Tribunal · document evidence</p><h1>forensics</h1><p class="lede">Compare the documents. Preserve the evidence. Ask answerable questions.</p><p>Document-level investigations with original sources, archived versions, file fingerprints and explicit limits. A difference is evidence of a difference—not, by itself, proof of motive or wrongdoing.</p><ul class="policy-list"><li><h2><a href="${forensicPath}">${e(r.title)} →</a></h2><p>${e(r.summary)}</p><p class="meta">reviewed ${e(r.checked)} · 2 guidance files · 9 grouped edits</p></li></ul>`}));
  await put("forensics/sovereign-ai/index.html", page({
    title:r.title, description:r.summary, path:forensicPath,
    meta:`<p class="meta">reviewed ${e(r.checked)} · <a href="/data/forensics/sovereign-ai.json">structured JSON</a> · <a href="${site.source_repo}/commits/main/data/forensics/sovereign-ai">edit history</a></p>`,
    body:`<style>
      .forensic-note{border-left:3px solid var(--gold);background:#eee8da;padding:1rem 1.2rem;margin:1.2rem 0}.forensic-note p{margin:.3rem 0}
      .evidence-links,.forensic-nav{display:flex;flex-wrap:wrap;gap:.6rem 1.2rem;font:600 13px/1.5 system-ui,sans-serif;margin:1rem 0}
      .forensic-nav{padding:1rem 0;border-block:1px solid var(--line)}.evidence-cards{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
      .evidence-card{border:1px solid var(--line);padding:1rem;background:white;min-width:0}.evidence-card h3{margin:0 0 .5rem}.evidence-card code{display:block;overflow-wrap:anywhere;font-size:11px;margin:.4rem 0}
      .forensic-table{overflow-x:auto}.forensic-table table{border-collapse:collapse;width:100%;font:14px/1.6 system-ui,sans-serif}.forensic-table th,.forensic-table td{text-align:left;vertical-align:top;border-bottom:1px solid var(--line);padding:.7rem .5rem}
      .forensic-change{margin:2rem 0;scroll-margin-top:1rem}.diff-pair{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line)}.diff-side{padding:1rem;min-width:0}.diff-side.before{background:#fff0ef}.diff-side.after{background:#eef8ef}.diff-side p{font:700 11px/1.5 system-ui,sans-serif;margin:0 0 .6rem}.diff-side del,.diff-side ins{display:block;text-decoration:none;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 ui-monospace,monospace}
      .forensic-analysis{font-size:.95rem}.forensic-quote{margin:1rem 0;border-left:3px solid var(--navy);padding:.3rem 1rem;background:white}.forensic-quote p{margin:.5rem 0}.forensic-draft{padding:1.2rem;border:1px solid var(--line);background:white}.forensic-draft li{margin-bottom:1rem}
      .forensic-method{font-size:.95rem}.forensic-method li{margin:.7rem 0}section[id]{scroll-margin-top:1rem}a:focus-visible,summary:focus-visible{outline:3px solid var(--gold);outline-offset:3px}details summary{cursor:pointer;font-weight:600}
      @media(max-width:600px){.evidence-cards,.diff-pair{grid-template-columns:1fr}.diff-side+.diff-side{border-top:1px solid var(--line)}}
    </style>
    <p class="kicker"><a href="/forensics/">forensics</a> · supporting evidence</p>
    <aside class="forensic-note"><strong>supporting document for an FOI request</strong><p>${e(r.scope)}</p><div class="evidence-links">${link(r.links.foi,"original FOI and correspondence")}${link(r.links.response,"16 October response")}${link(r.links.letter,"earlier open letter")}</div></aside>
    <h1>${e(r.title)}</h1><p class="lede">${e(r.subtitle)}</p><p>${e(r.summary)}</p><p class="meta">reviewed ${e(r.checked)} · v1: 10 pages → v2: 11 pages · nine grouped wording edits</p>
    <section id="documents"><h2>the documents and their archives</h2><p>Original and archived links open in a new tab. V1 and V2 are our comparison labels, not official version numbers.</p><div class="evidence-cards">${r.versions.map((v) => `<article class="evidence-card"><h3>${v.id} · ${v.pages} pages</h3><p>${link(v.url,"original PDF")}<br>${link(v.archive_url,"archived PDF")}</p><p class="meta">archive capture: ${e(v.archive_timestamp)}<br>PDF creation metadata: ${e(v.created)}<br>${v.bytes.toLocaleString("en-GB")} bytes</p><details><summary>fingerprint and reviewed copy</summary><code>SHA-256 ${v.sha256}</code><p class="meta">${e(v.verification)}</p><p>${link(`${forensicPath}${v.file}`,"preserved PDF")} · ${link(`${forensicPath}${v.text_file}`,"extracted text")}</p></details></article>`).join("")}</div><p class="attributed">The live downloads and archive payloads match the local PDFs byte-for-byte. Metadata dates are not publication dates. A hash is a file fingerprint, not a digital signature or proof of authorship.</p></section>
    <nav class="forensic-nav" aria-label="On this page"><a href="#findings">findings</a><a href="#notification">notification clause</a><a href="#comparison">comparison</a><a href="#foi-context">FOI context</a><a href="#follow-up">draft follow-up</a><a href="#method">method</a></nav>
    <section id="findings"><h2>what the evidence establishes</h2>${r.findings.map((f) => `<h3>${e(f.title)}</h3><p>${e(f.text)}</p>${f.changes.length ? `<p class="meta">${f.changes.map((id) => `<a href="#${id}">${id.replace("c","change ")}</a>`).join(" · ")}</p>` : ""}`).join("")}</section>
    <section id="retained-wording"><h2>important wording that did not change</h2>${r.unchanged_passages.map((p) => `<article id="${p.id}"><h3>${e(p.title)}</h3><blockquote class="forensic-quote"><p>${e(p.text)}</p></blockquote><p class="meta">${pdfLinks(p.pages)}</p></article>`).join("")}<p>The guidance also reserves the right to amend the process, timetable or documentation. Whether that power was exercised and communicated properly requires records beyond these PDFs.</p></section>
    <section id="comparison"><h2>nine grouped wording changes</h2><p>The excerpts below are document text; the interpretation beneath each pair is ours. These are nine edits, not nine new rules. Page links use physical PDF pages.</p><div class="forensic-table"><table><thead><tr><th>edit</th><th>change</th><th>type</th></tr></thead><tbody>${r.changes.map((c,i) => `<tr><td>${i+1}</td><td><a href="#${c.id}">${e(c.title)}</a></td><td>${e(c.kind)}</td></tr>`).join("")}</tbody></table></div>${r.changes.map((c,i) => `<article class="forensic-change" id="${c.id}"><h3>${String(i+1).padStart(2,"0")} · ${e(c.title)}</h3><p class="meta">${e(c.kind)} · ${pdfLinks(c.pages)}</p><div class="diff-pair"><div class="diff-side before"><p>− v1 / before</p>${c.before ? `<del>${e(c.before)}</del>` : "<p>No corresponding item in this section.</p>"}</div><div class="diff-side after"><p>+ v2 / after</p><ins>${e(c.after)}</ins></div></div><p class="forensic-analysis"><strong>interpretation:</strong> ${e(c.analysis)}</p></article>`).join("")}</section>
    <section id="foi-context"><h2>the FOI context</h2>${r.foi_context.map((p,i) => `<p>${e(p)}</p><p class="meta">${i===0 ? link(r.links.foi,"original request · 24 September 2026") : i===1 ? link(r.links.response,"department response · pages 5–6") : link(r.links.ico,"ICO guidance · section 12 and advice and assistance")}</p>`).join("")}<p>The earlier ${link(r.links.letter,"open letter")} is the requester’s critique of the scheme, not an official finding. This page documents changes and questions; it does not establish that the letter caused the revision.</p></section>
    <section id="follow-up"><h2>draft follow-up: records that would resolve the questions</h2><p class="meta">${e(r.draft_foi.status)}</p><div class="forensic-draft"><p>${e(r.draft_foi.intro)}</p><ol>${r.draft_foi.items.map((q) => `<li>${e(q)}</li>`).join("")}</ol><p>${e(r.draft_foi.closing)}</p></div><p class="attributed">These are suggested questions, not a guarantee that the request falls within the cost limit. A preference for continuous applications is a policy view; the FOI asks for the recorded reasons for the design chosen.</p></section>
    <section id="method"><h2>method, limits and corrections to the draft</h2><p>${e(r.provenance)}</p><ol class="forensic-method">${r.method.map((m) => `<li>${e(m)}</li>`).join("")}</ol><p>The draft’s assertion that the Batch 1 opening date was “written after it had passed” has been narrowed to what metadata can establish. Its “six substantive / three wording-only” classification is replaced with descriptive labels: the outcome-timing edit could affect expectations, while several checklist edits restate existing requirements.</p><p>Suggested publication practice: keep a dated version history, stable versioned URLs, archived copies, checksums and a short change notice. This is an editorial recommendation, not a finding of a universal legal requirement.</p><p>${link(`${site.source_repo}/issues`,"submit a source or correction")} · <a href="/data/forensics/sovereign-ai.json">download the structured comparison</a></p></section>`,
  }));
}
