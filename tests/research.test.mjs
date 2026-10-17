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

test("the sourced August ruling precedes the superseded Barclays5 reporting everywhere", async () => {
  const r = await json("public/data/research/barclays5.json");
  const u = r.updates[0];
  assert.equal(u.date, "2026-08-21");
  assert.equal(u.checked, "2026-10-17");
  assert.ok(u.sources.some((s) => s.type === "judgment" && s.url.endsWith("R-v-OHagan-and-others.pdf")));
  const html = await read("public/research/barclays5/index.html");
  assert.ok(html.indexOf(`id="${u.id}"`) < html.indexOf('aria-label="Research dossiers"'), "update above navigation and archived material");
  assert.ok(html.indexOf(`id="${u.id}"`) < html.indexOf('id="original-dossier"'));
  assert.match(html, /not an acquittal/);
  assert.match(html, /does not rule out terrorist-connection findings in other cases/);
  assert.match(html, /court subsequently rejected/);
  assert.match(html, /later sentencing and appeal outcomes have not been verified/);
  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === "barclays5").summary, r.summary);
  assert.ok((await read("public/research/index.html")).includes(r.summary));
  const related = await read("public/research/terrorist-connection/index.html");
  assert.ok(related.indexOf(`/research/barclays5/#${u.id}`) < related.indexOf('id="original-dossier"'));
  const full = await read("public/llms-full.txt");
  assert.ok(full.indexOf(u.summary) < full.indexOf("Activists Who Spray-Painted Barclays Set to Be Sentenced as Terrorists"));
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

test("the research collection has no dependency on the retired repo or hostname", async () => {
  const retired = /github\.com\/PlanetaryCouncil\/barclays5|barclays5\.planetarycouncil\.org/;
  for (const path of ["research/index.html", "data/research.json", "data/tiles.json", "llms.txt", "llms-full.txt", ...expected.flatMap((id) => [`research/${id}/index.html`, `data/research/${id}.json`])]) {
    const content = await read(`public/${path}`);
    assert.doesNotMatch(content, retired, path);
  }
  for (const id of expected) {
    assert.ok((await read(`public/research/${id}/index.html`)).includes(`https://github.com/independenttribunal/independenttribunal-www/blob/main/data/research/${id}.json`));
  }
  assert.doesNotMatch(await read("public/research/index.html"), /moved from Planetary Council|A new home for the Barclays5/);
  assert.equal((await read("CNAME")).trim(), "independenttribunal.org", "keep the Independent Tribunal domain");
});

test("the brochure text is included by default with an explicit superseded-content warning", async () => {
  const r = await json("public/data/research/barclays5.json");
  const html = await read("public/research/barclays5/index.html");
  const material = await read("data/research/materials/barclays5-brochure.html");
  assert.equal(r.supplementary.body_html, material);
  assert.ok(html.includes(material));
  assert.ok(html.indexOf('id="2026-08-21-ruling"') < html.indexOf('id="original-commentary"'));
  assert.match(html, /not a current campaign or an Independent Tribunal call to action/);
  assert.match(html, /superseded by the 21 August ruling/);
  for (const heading of ["Canary Wharf", "How it is done", "How we got here", "Put it to your MP"]) {
    assert.ok(material.includes(heading));
    assert.ok((await read("public/llms-full.txt")).includes(heading));
  }
});
