import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadResearch } from "../scripts/research.mjs";
import { fileURLToPath } from "node:url";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const expected = ["barclays5", "filton6", "terrorist-connection", "proscription-litigation", "hunger-strikes", "prairieland"];

test("six research dossiers retain source dates, provenance and unverified status", async () => {
  const errors = [];
  await loadResearch(fileURLToPath(new URL("../data", import.meta.url)), (where, message) => errors.push(`${where}: ${message}`));
  assert.deepEqual(errors, []);
  const { research } = await json("public/data/research.json");
  assert.deepEqual(research.map((r) => r.id), expected);
  for (const r of research) {
    assert.equal(r.source_as_of, "2026-07-28");
    assert.equal(r.verification, "historical-import-needs-current-review");
    assert.equal(r.provenance.commit, "9831cfdcb6ca0f63f488cd81794f8e6d0e79f88c");
    assert.ok(r.body_text.length > 500);
    assert.deepEqual(await json(`public/data/research/${r.id}.json`), r);
    const html = await read(`public/research/${r.id}/index.html`);
    assert.ok(html.includes(`<h1>${r.title}</h1>`));
    assert.ok(html.includes(`rel="canonical" href="https://independenttribunal.org/research/${r.id}/"`));
    assert.match(html, /current-status review pending/);
    assert.match(html, /not a verification date/);
    assert.match(html, /original author’s research and commentary/);
    assert.ok(html.includes(r.body_html), "original body retained");
    assert.match(html, new RegExp(`href="/research/${r.id}/" aria-current="page"`));
  }
});

test("no external citation from the original source and Hansard pages is lost", async () => {
  const manifest = await json("data/research-migration.json");
  const { research } = await json("public/data/research.json");
  const urls = new Set(research.flatMap((r) => r.links.map((l) => l.url)));
  assert.ok(manifest.external_links.length > 40);
  for (const url of manifest.external_links) assert.ok(urls.has(url), `missing ${url}`);
});

test("Hansard is accessible, attributed, and the statute correction is explicit", async () => {
  const hansard = await read("public/research/terrorist-connection/index.html");
  assert.match(hansard, /id="hansard"/);
  assert.match(hansard, /Open Parliament Licence/);
  assert.match(hansard, /Lord Parkinson/);
  assert.match(hansard, /9373DE44-BCFD-48F8-A201-87DA0F1EA53F/);
  const filton = await read("public/research/filton6/index.html");
  assert.match(filton, /Migration corrections/);
  assert.match(filton, /government of a country other than the United Kingdom/);
  assert.doesNotMatch(filton, /where the legislation points to the UK government or an intergovernmental body/);
});

test("all research pages are discoverable from index, tiles, sitemap and AI guide", async () => {
  const { tiles } = await json("public/data/tiles.json");
  const index = await json("public/data/index.json");
  assert.equal(index.datasets.find((d) => d.id === "research").count, 6);
  assert.deepEqual(index.coverage.research_pending_review, expected);
  for (const id of expected) {
    assert.ok(tiles.some((t) => t.kind === "research" && t.href === `/research/${id}/`));
    for (const path of ["research/index.html", "sitemap.xml", "llms.txt", "llms-full.txt"]) {
      assert.ok((await read(`public/${path}`)).includes(`/research/${id}/`), `${path}: ${id}`);
    }
  }
  assert.match(await read("public/llms.txt"), /NOT a fact-check date/);
});
