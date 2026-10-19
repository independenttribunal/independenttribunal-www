import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import test from "node:test";
import { loadForensics, forensicPath, wordDiff, normalizeExtract, validateChangeContext } from "../scripts/forensics.mjs";
const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");
const json = async (p) => JSON.parse(await read(p));

test("forensics validates all quoted excerpts against their physical PDF pages", async () => {
  const r = await loadForensics(fileURLToPath(new URL("data", root)));
  assert.equal(r.changes.length, 9);
  assert.deepEqual(r.versions.map((v) => v.pages), [10,11]);
  assert.equal(r.changes.find((c) => c.id === "c08").kind, "timing language");
  assert.match(r.unchanged_passages.find((p) => p.id === "continuous-onboarding").text, /at any time/);
  assert.match(r.unchanged_passages.find((p) => p.id === "notification").text, /notified via email/);
});

test("published evidence copies retain their exact original bytes", async () => {
  const r = await json("public/data/forensics/sovereign-ai.json");
  for (const v of r.versions) {
    const bytes = await readFile(new URL(`public${forensicPath}${v.file}`, root));
    assert.equal(bytes.subarray(0,5).toString(), "%PDF-");
    assert.equal(bytes.length, v.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), v.sha256);
    assert.deepEqual(bytes, await readFile(new URL(`data/forensics/sovereign-ai/${v.file}`, root)));
  }
});

test("forensic page shows supporting evidence and both archive links before the comparison", async () => {
  const r = await json("public/data/forensics/sovereign-ai.json");
  const html = await read("public/forensics/sovereign-ai/index.html");
  assert.match(html, /<h1>Sovereign AI<\/h1>/);
  assert.ok(html.indexOf("supporting evidence") < html.indexOf('<h1>'));
  for (const url of [r.links.foi, r.links.letter, ...r.versions.flatMap((v) => [v.url, v.archive_url])]) {
    assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`), url);
    assert.ok(html.indexOf(`href="${url}"`) < html.indexOf('id="comparison"'));
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), m[1]);
  assert.equal((html.match(/class="forensic-change"/g) ?? []).length, 9);
});

test("public forensics is limited to source metadata and highlighted differences", async () => {
  const r = await json("public/data/forensics/sovereign-ai.json");
  const html = await read("public/forensics/sovereign-ai/index.html");
  for (const field of ["scope", "findings", "unchanged_passages", "foi_context", "draft_foi", "method"]) assert.equal(r[field], undefined);
  for (const id of ["retained-wording", "notification", "foi-context", "follow-up", "method"]) assert.ok(!html.includes('id="'+id+'"'));
  assert.match(html, /metadata, not publication dates/);
  assert.match(html, /PDF author metadata \(masked\)/);
  assert.deepEqual(r.versions.map(v=>v.author_masked), ["R********", "j********"]);
  for (const v of r.versions) assert.ok(html.includes("<td>"+v.author_masked+"</td>"));
  assert.match(html, /<mark>/);
  assert.match(html, /darker = exact words changed/);
  assert.equal(r.changes.some(c=>c.analysis), false);
  const ai = await read("public/llms-full.txt");
  const forensicSection = ai.slice(ai.indexOf("## Sovereign AI:"));
  assert.ok(!forensicSection.includes("draft_foi"));
});

test("word-level highlighting preserves source text and isolates inserted wording", async () => {
  const r = await loadForensics(fileURLToPath(new URL("data", root)));
  for (const c of r.changes) {
    const diff = wordDiff(c.before,c.after);
    assert.equal(diff.before.map(t=>t.text).join(""),c.before??"");
    assert.equal(diff.after.map(t=>t.text).join(""),c.after);
  }
  const c = r.changes.find(c=>c.id==="c06");
  const diff = wordDiff(c.before,c.after);
  assert.equal(diff.after.filter(t=>t.changed).map(t=>t.text).join("")," within the Competition Date windows");
});

test("every change retains source-ordered context and renders it without change highlighting", async () => {
  const r = await loadForensics(fileURLToPath(new URL("data", root)));
  const html = await read("public/forensics/sovereign-ai/index.html");
  const exported = await json("public/data/forensics/sovereign-ai.json");
  assert.match(html, /white = unchanged context/);
  assert.match(html, /PDF line wrapping normalised/);
  for (const c of r.changes) {
    assert.ok(c.context.every(h => h.before.length + h.after.length > 0));
    assert.deepEqual(exported.changes.find(e => e.id === c.id).context, c.context);
    const article = html.split('id="'+c.id+'"')[1].split("</article>")[0];
    assert.match(article, /class="diff-row context"/);
    for (const row of article.matchAll(/<div class="diff-row context">([\s\S]*?)<\/div>/g)) {
      assert.doesNotMatch(row[1], /<mark>|<ins>|<del>/);
    }
  }
  const dates = html.split('id="c02"')[1].split("</article>")[0];
  const sequence = ["Batch 1:", "Opens", "15", "September", "2026", "Submit your proposal by 16 October", "Batch 2:", "14", "November", "Submit your proposal by 31 December", "Batch 3:", "30", "January", "Submit your proposal by 26 February"];
  let offset = 0;
  for (const text of sequence) {
    const index = dates.indexOf(text, offset);
    assert.ok(index >= 0, text);
    offset = index + text.length;
  }
});

test("context validation rejects invented wording, wrong order and missing hunks", async () => {
  const r = await json("data/forensics/sovereign-ai/record.json");
  const pages = await Promise.all(r.versions.map(async v => (await read("data/forensics/sovereign-ai/"+v.text_file)).split("\f").slice(0,v.pages).map(normalizeExtract)));
  const change = () => structuredClone(r.changes.find(c => c.id === "c03"));
  const invented = change();
  invented.context[0].before = ["Invented source wording."];
  assert.throws(() => validateChangeContext(invented,pages), /missing or out of order/);
  const reversed = change();
  [reversed.context[0].before,reversed.context[0].after] = [reversed.context[0].after,reversed.context[0].before];
  assert.throws(() => validateChangeContext(reversed,pages), /missing or out of order/);
  const missing = change();
  missing.context = [];
  assert.throws(() => validateChangeContext(missing,pages), /every diff hunk/);
});

test("forensics is discoverable from navigation, homepage data, sitemap and AI exports", async () => {
  const nav = await json("data/navigation.json");
  assert.ok(nav.links.some((l) => l.href === "/forensics/"));
  const tile = (await json("public/data/tiles.json")).tiles.find((t) => t.id === "sovereign-ai");
  assert.equal(tile.href, forensicPath);
  assert.equal(tile.kind, "forensics");
  for (const file of ["public/forensics/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) assert.ok((await read(file)).includes(forensicPath), file);
  const dataset = (await json("public/data/index.json")).datasets.find((d) => d.id === "sovereign-ai-forensics");
  assert.equal(dataset.count, 9);
  assert.equal(dataset.page, `https://independenttribunal.org${forensicPath}`);
});
