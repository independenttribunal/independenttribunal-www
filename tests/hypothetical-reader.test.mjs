import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { profileText, validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const slug = "hypothetical-reader";

test("research notice precedes the article and survives both machine-readable exports", async () => {
  const p = await json(`data/profiles/${slug}.json`);
  validateProfile(p, (message) => assert.fail(message));
  const html = await read(`public/research/${slug}/index.html`);
  assert.ok(html.indexOf(p.reader_notice) < html.indexOf("<h1>"));
  assert.match(html, /<aside class="profile-reader-notice" aria-label="Research reading notice">/);
  assert.equal((await json(`public/data/profiles/${slug}.json`)).reader_notice, p.reader_notice);
  assert.ok((await read("public/llms-full.txt")).includes(p.reader_notice));
  assert.ok(profileText(p).startsWith(`Reader notice: ${p.reader_notice}`));
  assert.throws(() => validateProfile({ ...p, reader_notice: " " }, (message) => { throw new Error(message); }), /reader notice/);
  assert.throws(() => validateProfile({ ...p, reader_notice: 42 }, (message) => { throw new Error(message); }), /reader notice/);
});

test("the companion is discoverable with complete citations, valid anchors and resolved source attribution", async () => {
  const p = await json(`data/profiles/${slug}.json`);
  const html = await read(`public/research/${slug}/index.html`);
  const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(anchors).size, anchors.length);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(m[1]), m[1]);
  const numbers = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(numbers, p.sources.map((_, i) => i + 1));
  const exported = await json(`public/data/profiles/${slug}.json`);
  for (const section of exported.sections) for (const entry of section.entries) for (const paragraph of entry.paragraphs) for (const source of paragraph.sources) assert.ok(source.url && source.type && source.checked, source.id);
  for (const path of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt"]) assert.ok((await read(path)).includes(`/research/${slug}/`), path);
  assert.equal((await json("public/data/tiles.json")).tiles.find((t) => t.id === slug).kind, "study");
  for (const related of ["absurdity-paradox", "grossly-offensive", "not-conducive-to-the-public-good"]) assert.ok((await read(`public/research/${related}/index.html`)).includes(`/research/${slug}/`));
});
