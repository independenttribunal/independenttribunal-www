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
    if (!/^[A-Za-z]\*{8}$/.test(v.author_masked)) throw new Error("Expected a masked PDF author initial");
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

export function publicForensics(r) {
  const {id,title,subtitle,summary,checked,versions} = r;
  return {id,title,subtitle,summary,checked,versions,links:{foi:r.links.foi,letter:r.links.letter},
    changes:r.changes.map(({analysis,...c})=>c)};
}
export function forensicText(r,site) {
  return "## "+r.title+"\nURL: "+site.url+forensicPath+"\nSupporting evidence\n"+JSON.stringify(publicForensics(r),null,2);
}

// Longest-common-subsequence matching preserves exact text and marks changed words.
export function wordDiff(before,after) {
  const tokens=s=>s.match(/\s+|[\p{L}\p{N}’']+|[^\s\p{L}\p{N}’']/gu)??[];
  const a=tokens(before??""),b=tokens(after);
  const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--)
    dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const left=[],right=[];let i=0,j=0;
  while(i<a.length||j<b.length) {
    if(i<a.length&&j<b.length&&a[i]===b[j]) {
      left.push({text:a[i++],changed:false});right.push({text:b[j++],changed:false});
    } else if(i<a.length&&(j===b.length||dp[i+1][j]>=dp[i][j+1])) left.push({text:a[i++],changed:true});
    else right.push({text:b[j++],changed:true});
  }
  return {before:left,after:right};
}
export async function publishForensics({record:r,dataDir,put,page,escapeHtml:e,site}) {
  const link=(url,label)=>'<a href="'+e(url)+'" target="_blank" rel="noopener noreferrer">'+e(label)+' ↗</a>';
  for(const v of r.versions) {
    await put("forensics/sovereign-ai/"+v.file,await readFile(join(dataDir,"forensics",r.id,v.file)));
    await put("forensics/sovereign-ai/"+v.text_file,await readFile(join(dataDir,"forensics",r.id,v.text_file),"utf8"));
  }
  await put("data/forensics/sovereign-ai.json",{...publicForensics(r),url:site.url+forensicPath});
  await put("forensics/index.html",page({title:"forensics",path:"/forensics/",description:"Document comparisons, source files and archives.",
    body:'<p class="kicker">Independent Tribunal · supporting evidence</p><h1>forensics</h1><p class="lede">Document differences, sources and metadata.</p><ul class="policy-list"><li><h2><a href="'+forensicPath+'">'+e(r.title)+' →</a></h2><p>'+e(r.summary)+'</p><p class="meta">2 guidance files · 9 grouped edits</p></li></ul>'}));
  const highlighted=tokens=>tokens.map(t=>t.changed?'<mark>'+e(t.text)+'</mark>':e(t.text)).join("");
  const row=(kind,tokens)=>{
    const tag=kind==="removed"?"del":"ins";
    return '<div class="diff-row '+kind+'"><span class="diff-sign" aria-label="'+kind+'">'+(kind==="removed"?"−":"+")+'</span><'+tag+'>'+highlighted(tokens)+'</'+tag+'></div>';
  };
  const changes=r.changes.map((c,i)=>{
    const diff=wordDiff(c.before,c.after);
    const pages=r.versions.map((v,n)=>link(v.url+"#page="+c.pages[n],v.id+" p"+c.pages[n])).join(" → ");
    return '<article class="forensic-change" id="'+c.id+'"><h3><span class="change-number">'+String(i+1).padStart(2,"0")+'</span> '+e(c.title)+'</h3><div class="forensic-diff"><div class="diff-header"><span>'+e(c.kind)+'</span><span>'+pages+'</span></div>'+(c.before?row("removed",diff.before):"")+row("added",diff.after)+'</div></article>';
  }).join("");
  const metadataRow=(label,fn)=>'<tr><th scope="row">'+label+'</th>'+r.versions.map(v=>'<td>'+fn(v)+'</td>').join("")+'</tr>';
  const style='<style>'+
    '.forensic-content{font:15px/1.6 system-ui,sans-serif}.forensic-content h1,.forensic-content h2,.forensic-content h3{font-family:system-ui,sans-serif;letter-spacing:normal}'+
    '.forensic-content h1{font-size:clamp(30px,5vw,42px);margin-bottom:.4rem}.forensic-content h2{font-size:21px;margin:2rem 0 .8rem}.forensic-content h3{font-size:16px;font-weight:600;margin:0 0 .7rem}'+
    '.forensic-links,.diff-legend{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;font-size:13px;margin:.8rem 0}'+
    '.forensic-table{overflow-x:auto;border:1px solid var(--line);border-radius:6px;background:white}.forensic-table table{width:100%;border-collapse:collapse;font-size:13px}.forensic-table th,.forensic-table td{padding:.6rem .75rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}.forensic-table th{font-weight:600}.forensic-table thead{background:#f6f8fa}.forensic-table tr:last-child>*{border-bottom:0}'+
    '.forensic-files table{table-layout:fixed}.forensic-files th:first-child{width:22%}.forensic-files td{overflow-wrap:anywhere}.forensic-files code{font-size:11px;overflow-wrap:anywhere}.forensic-files details{margin-top:.4rem}.forensic-files summary{cursor:pointer;font-weight:600}.forensic-small{font-size:12px;color:var(--muted);margin:.6rem 0}'+
    '.forensic-change{margin:1.8rem 0;scroll-margin-top:1rem}.change-number{font:600 13px ui-monospace,monospace;color:var(--muted)}.forensic-diff{border:1px solid var(--line);border-radius:6px;overflow:hidden;background:white}'+
    '.diff-header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem 1rem;background:#f6f8fa;border-bottom:1px solid var(--line);padding:.5rem .75rem;font:12px/1.6 ui-monospace,monospace}'+
    '.diff-row{display:grid;grid-template-columns:30px minmax(0,1fr);font:13px/1.7 ui-monospace,monospace}.diff-row del,.diff-row ins{display:block;text-decoration:none;white-space:pre-wrap;overflow-wrap:anywhere;padding:.5rem .7rem}.diff-sign{text-align:center;padding:.5rem 0;user-select:none}'+
    '.removed{background:#ffebe9}.removed .diff-sign{background:#ffd7d5;color:#82071e}.added{background:#e6ffec}.added .diff-sign{background:#ccffd8;color:#116329}.diff-row mark{color:inherit;border-radius:2px}.removed mark{background:#ffcecb}.added mark{background:#abf2bc}'+
    '.diff-legend span{padding:1px 6px;border-radius:3px}.diff-legend .exact{background:#abf2bc}'+
    '@media(max-width:600px){.forensic-table th,.forensic-table td{padding:.5rem}.forensic-files table{font-size:12px}.diff-row{font-size:12px;grid-template-columns:23px minmax(0,1fr)}}'+
    '</style>';
  const body=style+'<div class="forensic-content"><p class="kicker"><a href="/forensics/">forensics</a> · supporting evidence</p><h1>'+e(r.title)+'</h1><p>'+e(r.subtitle)+'</p>'+
    '<div class="forensic-links">'+link(r.links.foi,"original FOI")+link(r.links.letter,"open letter")+'</div>'+
    '<section id="documents"><h2>the two files</h2><div class="forensic-table forensic-files"><table><thead><tr><th>PDF metadata</th><th>v1 · original</th><th>v2 · revised</th></tr></thead><tbody>'+
    metadataRow("sources",v=>link(v.url,"original PDF")+"<br>"+link(v.archive_url,"web archive")+"<br>"+link(forensicPath+v.file,"preserved copy"))+
    metadataRow("PDF author metadata (masked)",v=>e(v.author_masked))+
    metadataRow("created",v=>e(v.created))+metadataRow("archive capture",v=>e(v.archive_timestamp))+
    metadataRow("pages",v=>v.pages)+metadataRow("bytes",v=>v.bytes.toLocaleString("en-GB"))+
    metadataRow("SHA-256",v=>'<details><summary>file fingerprint</summary><code>'+v.sha256+'</code><p>'+link(forensicPath+v.text_file,"extracted text")+'</p></details>')+
    '</tbody></table></div><p class="forensic-small">PDF creation timestamps are metadata, not publication dates. Original, archived and preserved files matched byte-for-byte when checked on '+e(r.checked)+'. V1 and V2 are comparison labels.</p></section>'+
    '<section id="comparison"><h2>nine wording changes</h2><div class="diff-legend"><span class="removed">− removed</span><span class="added">+ added</span><span class="exact">darker = exact words changed</span></div>'+
    '<div class="forensic-table"><table><thead><tr><th>#</th><th>change</th><th>pages v1 → v2</th></tr></thead><tbody>'+
    r.changes.map((c,i)=>'<tr><td>'+String(i+1).padStart(2,"0")+'</td><td><a href="#'+c.id+'">'+e(c.title)+'</a></td><td>'+c.pages[0]+' → '+c.pages[1]+'</td></tr>').join("")+
    '</tbody></table></div>'+changes+'</section></div>';
  await put("forensics/sovereign-ai/index.html",page({title:r.title,description:r.summary,path:forensicPath,
    meta:'<p class="meta">checked '+e(r.checked)+' · <a href="/data/forensics/sovereign-ai.json">structured JSON</a> · <a href="'+site.source_repo+'/commits/main/data/forensics/sovereign-ai">edit history</a></p>',body}));
}
