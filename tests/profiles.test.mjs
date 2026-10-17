import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const source = () => json("data/profiles/roger-hallam.json");

test("Hallam profile keeps sourced outcomes separate from mentions and biography", async () => {
  const p = await source();
  const errors = [];
  validateProfile(p, (error) => errors.push(error));
  assert.deepEqual(errors, []);
  assert.equal(p.checked, "2026-10-17");
  assert.match(p.scope, /not an entry in a judges database/);
  assert.match(p.scope, /Not a complete criminal record/);
  const cases = p.sections.find((s) => s.id === "as-a-defendant").entries;
  assert.deepEqual(cases.map((c) => c.citation), ["Maxey & Hallam v R [2025] EWCA Crim 472", "Hallam & Ors v R [2025] EWCA Crim 199"]);
  assert.equal(p.sections.find((s) => s.id === "other-judgments").entries.length, 4);
  assert.ok(p.sources.some((s) => s.id === "uksc" && s.date === "2025-10-08"));
  const text = JSON.stringify(p);
  assert.match(text, /five-week Inner London sentence and Lewes suspended sentence are discussed under Louise Lancaster/);
  assert.match(text, /current custody status/);
  assert.match(text, /not proof that the jury accepted a particular legal argument/);
  assert.doesNotMatch(text, /magistrates.*not published anywhere/i);
});

test("Hallam page has source links, working anchors and metadata", async () => {
  const p = await source();
  const html = await read("public/research/roger-hallam/index.html");
  assert.match(html, /<h1>Roger Hallam<\/h1>/);
  assert.match(html, /<title>Roger Hallam — Independent Tribunal<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/independenttribunal.org\/research\/roger-hallam\/"/);
  assert.ok(html.indexOf('id="later-developments"') < html.indexOf('id="as-a-defendant"'));
  for (const s of p.sources) assert.ok(html.includes(`href="${s.url}"`), s.id);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "unique HTML anchors");
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.match(html, /not a fresh merits judgment/);
  assert.match(html, /Not a complete criminal record/);
});

test("profiles are discoverable and preserve paragraph-level attribution in exports", async () => {
  const p = await json("public/data/profiles/roger-hallam.json");
  const collection = await json("public/data/profiles.json");
  assert.deepEqual(collection.profiles, [p]);
  assert.equal(p.url, "https://independenttribunal.org/research/roger-hallam/");
  for (const s of p.sections) for (const entry of s.entries) for (const para of entry.paragraphs) for (const ref of para.sources) {
    assert.ok(ref.title && ref.type && ref.publisher && ref.checked);
    assert.match(ref.url, /^https:\/\//);
  }
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(file)).includes("/research/roger-hallam/"), file);
  }
  const full = await read("public/llms-full.txt");
  assert.match(full, /not an entry in a judges database/);
  assert.match(full, /Supreme Court/);
  assert.match(full, /Self-description/);
  assert.ok(full.includes("https://supremecourt.uk/cases/uksc-2025-0096"));
  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === p.id).kind, "profile");
  const index = await json("public/data/index.json");
  assert.equal(index.datasets.find((d) => d.id === "profiles").count, 1);
  assert.equal(index.datasets.find((d) => d.id === "research").count, 6, "historical imports remain a distinct dataset");
});

test("profile validation rejects broken citations and unsafe or duplicate anchors", async () => {
  const original = await source();
  for (const [mutate, pattern] of [
    [(p) => { p.sections[0].entries[0].paragraphs[0].sources[0].id = "missing-source"; }, /unknown source/],
    [(p) => { p.sections[1].id = p.sections[0].id; }, /duplicate anchor/],
    [(p) => { p.sources[0].url = "javascript:alert(1)"; }, /HTTPS/],
    [(p) => { p.sections[0].entries[0].paragraphs[0].sources = []; }, /factual paragraph requires sources/],
    [(p) => { p.highlights[0].target = "absent"; }, /existing target/],
    [(p) => { p.checked = "today"; }, /checked date/],
  ]) {
    const p = structuredClone(original);
    mutate(p);
    const errors = [];
    validateProfile(p, (error) => errors.push(error));
    assert.match(errors.join("\n"), pattern);
  }
});
