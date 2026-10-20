import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { validateProfile, profileText } from "../scripts/profiles.mjs";

const id = "frameworks-of-truth";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("truth framework's title matches its argument and separates findings, incentives and proposals", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.title, "Frameworks of truth: what does the system reward?");
  assert.equal(p.category, "legal-study");
  assert.match(p.scope, /not the later confession/);
  assert.match(p.status_note, /Disbarred and the finding as Final/);
  assert.match(p.status_note, /not found a published appeal decision/);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((entry) => [entry.id, entry]));
  const text = (entry) => entries.get(entry).paragraphs.map((p) => p.text).join(" ");
  assert.match(text("register-record"), /Core Duty 3/);
  assert.ok(!entries.has("editorial-method"), "no editing log on the published page");
  assert.match(text("existing-mitigation"), /already lists prompt self-reporting/);
  assert.match(text("our-incentive-argument"), /narrower than saying it received no weight/);
  assert.match(text("counterargument"), /did not relieve the tribunal/);
  assert.match(text("satire-not-a-loophole"), /cease acting without revealing/);
  assert.match(entries.get("five-labels").kind, /not an existing legal classification/);
  assert.deepEqual(entries.get("five-labels").table.rows.map((r) => r[0]), ["Asserted", "Signed", "Supported", "Checked", "Found"]);
});

test("all four images match the reviewed files, are named by case number and carry transcripts", async () => {
  const p = await json(`data/profiles/${id}.json`);
  const review = await json("data/reviews/frameworks-of-truth.json");
  const html = await read(`public/research/${id}/index.html`);
  assert.equal(p.artworks.length, 4);
  for (const art of p.artworks) {
    const bytes = await readFile(new URL(`../public${art.src}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), review.input.images.find((a) => a.src === art.src).sha256);
    const start = html.indexOf(`<section class="profile-section" id="${art.after_section}">`);
    const end = html.indexOf("</section>", start);
    const position = html.indexOf(`<img src="${art.src}"`);
    assert.ok(position > start && position < end, art.after_section);
    assert.equal(html.split(`<img src="${art.src}"`).length - 1, 1);
    assert.ok(art.alt && art.caption && art.transcript);
    assert.match(art.src, /^\/images\/(case-2024-1532-|misleading-)/);
    assert.doesNotMatch(art.caption, /user-supplied|reproduced unchanged/i);
    assert.ok(profileText({ ...p, url: `/research/${id}/` }).includes(art.transcript));
    if (art.src.endsWith(".png")) {
      assert.equal(bytes.readUInt32BE(16), art.width);
      assert.equal(bytes.readUInt32BE(20), art.height);
    }
  }
  assert.equal((html.match(/<summary>Read the image text<\/summary>/g) ?? []).length, 4);
  assert.match(html, /href="\/images\/misleading-professional-rules.jpg" target="_blank" rel="noopener noreferrer"/);
});

test("truth framework has ordered source links and appears in discovery and machine exports", async () => {
  const p = await json(`public/data/profiles/${id}.json`);
  const html = await read(`public/research/${id}/index.html`);
  const numbers = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(numbers, p.sources.map((_, i) => i + 1));
  const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(anchors).size, anchors.length);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(m[1]), m[1]);
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) assert.ok((await read(file)).includes(`/research/${id}/`), file);
  assert.equal((await json("public/data/tiles.json")).tiles.find((t) => t.id === id).kind, "study");
  for (const section of p.sections) for (const entry of section.entries) for (const para of entry.paragraphs) for (const ref of para.sources) assert.ok(ref.url && ref.title && ref.publisher);
  assert.ok((await read("public/llms-full.txt")).includes("Label: Checked"));
  assert.equal(p.artworks.length, 4);
});

test("section artwork rejects missing transcripts, unsafe paths and nonexistent placement", async () => {
  const p = await json(`data/profiles/${id}.json`);
  for (const mutate of [
    (p) => { p.artworks = {}; },
    (p) => { p.artworks[0].after_section = "absent"; },
    (p) => { p.artworks[0].transcript = ""; },
    (p) => { p.artworks[0].src = "/images/../private.png"; },
    (p) => { p.artworks[0].width = 0; },
  ]) {
    const copy = structuredClone(p);
    mutate(copy);
    assert.throws(() => validateProfile(copy, (message) => { throw new Error(message); }));
  }
});
