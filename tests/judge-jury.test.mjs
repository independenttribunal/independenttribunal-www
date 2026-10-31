import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { validateProfile, profileText } from "../scripts/profiles.mjs";

const id = "defences-withdrawn-from-jury";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("judge–jury study preserves the introduction, infographic and legal distinctions", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.subtitle, "The system trusts jurors to judge the evidence, but gives judges control over the legal framework and the evidence they receive.");
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entry) => entries.get(entry).paragraphs.map((p) => p.text).join(" ");
  assert.match(p.scope, /before or during trial/);
  assert.match(text("no-directed-conviction"), /Paragraph 14/);
  assert.match(text("threshold"), /considerable caution/);
  assert.match(text("three-different-decisions"), /prosecution evidence/);
  assert.match(text("reconsideration"), /material change of circumstances/);
  assert.match(text("early-appeal"), /does not convert an ordinary section 40 ruling/);
  assert.match(text("conviction-appeal"), /28 days of conviction/);
  assert.match(text("colston-reference"), /prevents this reference procedure from affecting the original acquittal/);
  assert.match(text("webster-2026"), /dismissed the appeals/);
  assert.match(entries.get("two-reforms").kind, /not existing rights/);
  const review = await json("data/reviews/judge-jury-defences.json");
  const image = await readFile(new URL(`../public${p.evidence_image.src}`, import.meta.url));
  assert.equal(createHash("sha256").update(image).digest("hex"), review.input.image_sha256);
  assert.equal(image.readUInt32BE(16), p.evidence_image.width);
  assert.equal(image.readUInt32BE(20), p.evidence_image.height);
});

test("judge–jury page has an accessible table, image, sequential sources and valid anchors", async () => {
  const p = await json(`data/profiles/${id}.json`);
  const html = await read(`public/research/${id}/index.html`);
  const table = p.sections[0].entries[0].table;
  assert.ok(html.includes(`<caption>${table.caption}</caption>`));
  assert.match(html, /<th scope="col"[^>]*>Stage<\/th>/);
  assert.match(html, /<th scope="row"[^>]*>Reach the verdict<\/th>/);
  assert.ok(html.indexOf('<caption>') < html.indexOf(`<img src="${p.evidence_image.src}"`));
  assert.ok(html.indexOf(`<img src="${p.evidence_image.src}"`) < html.indexOf('id="procedure"'));
  assert.equal(html.split(`<img src="${p.evidence_image.src}"`).length - 1, 1);
  for (const s of p.sources) assert.ok(html.includes(`href="${s.url}" target="_blank" rel="noopener noreferrer"`), s.id);
  const numbers = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(numbers, p.sources.map((_, i) => i + 1));
  const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(anchors).size, anchors.length);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(m[1]), m[1]);
});

test("judge–jury study is discoverable and machine-readable, including its table", async () => {
  const p = await json(`public/data/profiles/${id}.json`);
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) assert.ok((await read(file)).includes(`/research/${id}/`), file);
  assert.equal((await json("public/data/tiles.json")).tiles.find((t) => t.id === id).kind, "study");
  assert.ok(!(await read("public/people/index.html")).includes(`/research/${id}/`));
  for (const section of p.sections) for (const entry of section.entries) for (const para of entry.paragraphs) for (const ref of para.sources) assert.ok(ref.url && ref.publisher && ref.title && ref.checked);
  const full = await read("public/llms-full.txt");
  assert.ok(full.includes("Stage: Reach the verdict · Who decides: Jury"));
  assert.ok(full.includes(p.evidence_image.caption));
  for (const related of ["anarchist-cookbook-section-58", "public-order"]) assert.ok((await read(`public/research/${related}/index.html`)).includes(`/research/${id}/`));
});

test("profile tables and image placement reject malformed structures", async () => {
  const p = await json(`data/profiles/${id}.json`);
  for (const mutate of [
    (p) => { p.sections[0].entries[0].table.rows[0] = ["too short"]; },
    (p) => { p.sections[0].entries[0].table.caption = ""; },
    (p) => { p.evidence_image.after_section = "missing-section"; },
  ]) {
    const copy = structuredClone(p);
    mutate(copy);
    assert.throws(() => validateProfile(copy, (message) => { throw new Error(message); }));
  }
  assert.match(profileText({ ...p, url: `/research/${id}/` }), /Who decides: Jury/);
});
