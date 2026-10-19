import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const id = "anarchist-cookbook-section-58";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("section 58 study is discoverable and keeps the shared research format", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  for (const path of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(path)).includes(`/research/${id}/`), path);
  }
  const tiles = (await json("public/data/tiles.json")).tiles;
  assert.equal(tiles.find((tile) => tile.id === id).kind, "study");
  const exported = await json(`public/data/profiles/${id}.json`);
  assert.equal(exported.sections.length, p.sections.length);
  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /site-shell\.css/);
  assert.ok(html.includes(`<h1>${p.title}</h1>`));
  assert.match(html, /rel="canonical" href="https:\/\/independenttribunal.org\/research\/anarchist-cookbook-section-58\/"/);
});

test("section 58 citations are sequential, open in new tabs and use valid anchors", async () => {
  const p = await json(`data/profiles/${id}.json`);
  const html = await read(`public/research/${id}/index.html`);
  const numbers = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(numbers, p.sources.map((_, i) => i + 1));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  for (const source of p.sources) assert.ok(html.includes(`href="${source.url}" target="_blank" rel="noopener noreferrer"`));
  assert.ok(p.sources.every((source) => !/amazon\./i.test(source.url)), "cite the purchase record, not a manual purchase link");
});

test("section 58 study retains checked corrections rather than supplied AI claims", async () => {
  const p = await json(`data/profiles/${id}.json`);
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entry) => entries.get(entry).paragraphs.map((p) => p.text).join(" ");
  assert.match(text("reasonable-excuse"), /section 118/i);
  assert.match(text("reasonable-excuse"), /prosecution disproves it beyond reasonable doubt/);
  assert.match(text("reasonable-excuse"), /58\(3A\)\(b\)\(i\)–\(ii\)/);
  assert.match(text("practical-assistance"), /rejects describing section 58 as strict liability/);
  assert.match(text("amazon-record"), /not confirmation of current stock/);
  assert.match(text("howarth-case"), /54 months[\s\S]*45 months/);
  assert.equal(entries.get("bel-case").citation, "R v Bel [2021] EWCA Crim 1461");
  assert.equal(entries.get("john").citation, "R v John [2022] EWCA Crim 54");
  assert.match(text("john"), /acquitted of the six other counts/);
  assert.match(text("cristea"), /not a conviction for the suspected Leeds plot/);
  assert.match(text("walker-case"), /nor disclose exactly why the jury acquitted/);
  assert.match(text("creagh-case"), /neither challenged the verdicts nor purported to reveal the jury/);
});

test("curiosity follow-up distinguishes the legal rule, evidence and academic critique", async () => {
  const p = await json(`data/profiles/${id}.json`);
  assert.equal(p.sections[0].id, "curiosity");
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((p) => p.text).join(" ");
  assert.match(text("curiosity-rule"), /not one that can be answered in the abstract/);
  assert.ok(entries.get("curiosity-rule").paragraphs[0].sources.some((s) => s.id === "gj" && s.locator === "para 83"));
  assert.match(text("dunleavy-case"), /innocent purpose did not neutralise an impermissible additional purpose/);
  assert.match(text("dunleavy-case"), /not another Cookbook prosecution/);
  assert.match(text("academic-research"), /does not require university affiliation, peer review or ethics-board approval/);
  assert.match(text("academic-research"), /non-exhaustive/);
  assert.match(text("ordinary-information"), /“dual use” is not a blanket exemption/);
  assert.match(text("curiosity-in-practice"), /six interviews/);
  assert.match(text("curiosity-in-practice"), /not a rule of law or a measured acquittal rate/);
  assert.match(text("informed-reader"), /case-specific advice/);
  const html = await read(`public/research/${id}/index.html`);
  assert.ok(html.includes('id="curiosity"'));
  assert.ok(html.includes('id="ordinary-information"'));
});
