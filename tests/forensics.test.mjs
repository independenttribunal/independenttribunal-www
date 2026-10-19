import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import test from "node:test";
import { loadForensics, forensicPath } from "../scripts/forensics.mjs";
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

test("forensic page puts the FOI context and both archive links before the comparison", async () => {
  const r = await json("public/data/forensics/sovereign-ai.json");
  const html = await read("public/forensics/sovereign-ai/index.html");
  assert.match(html, /<h1>sovereign ai<\/h1>/);
  assert.ok(html.indexOf("supporting document for an FOI request") < html.indexOf('<h1>'));
  for (const url of [r.links.foi, r.links.response, r.links.letter, ...r.versions.flatMap((v) => [v.url, v.archive_url])]) {
    assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`), url);
    assert.ok(html.indexOf(`href="${url}"`) < html.indexOf('id="comparison"'));
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), m[1]);
  assert.equal((html.match(/class="forensic-change"/g) ?? []).length, 9);
});

test("forensic analysis distinguishes document changes, notification evidence and draft questions", async () => {
  const r = await json("public/data/forensics/sovereign-ai.json");
  const html = await read("public/forensics/sovereign-ai/index.html");
  assert.match(r.scope, /draft, not a submitted request/);
  assert.match(html, /cannot conclude that nobody was notified/);
  assert.match(html, /Stage 1 onboarding remains continuous/i);
  assert.match(html, /does not say that the words/);
  assert.match(html, /not a digital signature/);
  assert.match(html, /metadata, not proof of when wording was written/);
  assert.match(html, /does not establish that the letter caused/);
  assert.equal(r.draft_foi.items.length, 4);
  assert.match(r.draft_foi.items[2], /does not assume that no notification was sent/);
  assert.match(r.draft_foi.items[3], /Stage 2/);
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
