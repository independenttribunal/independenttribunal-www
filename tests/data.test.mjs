import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../public/${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("publishes a data index that agents can start from", async () => {
  const index = await json("data/index.json");
  assert.equal(index.url, "https://independenttribunal.org");
  assert.ok(index.datasets.length >= 3);
  for (const d of index.datasets) assert.match(d.url, /^https:\/\/independenttribunal\.org\/data\//);
  assert.ok(Array.isArray(index.coverage.entries_without_sources));
});

test("timeline JSON resolves every source to a real URL", async () => {
  const t = await json("data/timelines/uk-ratchet.json");
  const entries = t.sections.flatMap((s) => s.entries ?? []);
  assert.ok(entries.length > 25);
  for (const e of entries) for (const s of e.sources) assert.match(s.url, /^https:\/\//);
  assert.ok(entries.some((e) => e.id === "trudi-warner"));
  assert.ok(entries.some((e) => e.id === "proscription"));
});

test("timeline page keeps its anchors and shows sources", async () => {
  const html = await read("uk-timeline/index.html");
  for (const id of ["trudi-warner", "how-it-works", "proscription"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /<title>UK timeline — Independent Tribunal<\/title>/);
  assert.match(html, /legislation\.gov\.uk\/ukpga\/2000\/11\/section\/1"/);
  assert.doesNotMatch(html, /\{\{[A-Z]+\}\}/);
});

test("timeline uses the homepage primary navigation without replacing its filters", async () => {
  const navigation = JSON.parse(await readFile(new URL("../data/navigation.json", import.meta.url), "utf8"));
  const html = await read("uk-timeline/index.html");
  const header = html.match(/<header class="global-header">([\s\S]*?)<\/header>/)?.[1];
  assert.ok(header, "site header exists before the timeline hero");
  assert.match(header, /aria-label="Primary"/);
  let previous = -1;
  for (const link of navigation.links) {
    const offset = header.indexOf(`href="${link.href}"`);
    assert.ok(offset > previous, `${link.label} is in homepage menu order`);
    assert.ok(header.includes(`>${link.label}</a>`));
    previous = offset;
  }
  assert.ok(header.includes(`href="${navigation.app.href}"`));
  assert.match(header, /href="\/" aria-label="Independent Tribunal home"/);
  assert.match(header, /href="\/uk-timeline\/" aria-current="page"/);
  assert.ok(html.indexOf('class="global-header"') < html.indexOf('<header class="hero">'));
  assert.match(html, /aria-label="Filter timeline entries"/);
  assert.match(html, /data-filter="all"/);
});

test("timeline starts on the shared site surface and retains scroll-driven colours", async () => {
  const html = await read("uk-timeline/index.html");
  const shell = await read("site-shell.css");
  const background = shell.match(/background:(#[\da-f]+);/)?.[1];
  assert.ok(background);
  assert.ok(html.includes(`--paper: ${background};`));
  assert.match(html, /body\[data-era="0"\] \{ --era-bg: var\(--paper\)/);
  assert.match(html, /body\[data-era="5"\] \{ --era-bg: #131210/);
  assert.ok(html.includes('document.querySelectorAll("header.hero, section[data-era]")'));
  assert.ok(html.includes('body.dataset.era = e.target.dataset.era || "0"'));
});

test("editorial titles use consistent sentence case across tiles, pages and exports", async () => {
  const { tiles } = await json("data/tiles.json");
  const llms = await read("llms.txt");
  const fullText = await read("llms-full.txt");
  const expected = {
    "terrorist-connection-add-on": "Terrorist connection add-on",
    "proscription-litigation": "Proscription litigation",
    "hunger-strikes": "The hunger strikes",
    "terrorism-definition": "The definition of terrorism",
    "uk-ratchet": "UK timeline",
  };
  for (const [id, title] of Object.entries(expected)) {
    const tile = tiles.find((item) => item.id === id);
    assert.equal(tile.title, title);
    const html = await read(`${tile.href.slice(1)}index.html`);
    assert.ok(html.includes(`<h1>${title}</h1>`), id);
    assert.ok(html.includes(`<title>${title} — Independent Tribunal</title>`), id);
    assert.ok(llms.includes(title), id);
    assert.ok(fullText.includes(title), id);
  }
});

test("publishes the policies as HTML and Markdown", async () => {
  for (const slug of ["editorial-standards", "terrorism-and-proscribed-organisations", "moderation", "privacy"]) {
    const html = await read(`legal/${slug}/index.html`);
    assert.match(html, /analyses evidence, law and public records from first principles/);
    assert.doesNotMatch(html, /Independent Tribunal is not a court|A private contact address is being set up/);
    assert.match(await read(`legal/${slug}.md`), /^# /);
  }
  const terrorism = await read("legal/terrorism-and-proscribed-organisations/index.html");
  assert.match(terrorism, /does <strong>not<\/strong> support any proscribed organisation/);
  assert.match(terrorism, /href="\/legal\/editorial-standards\/"/);
  const editorial = await read("legal/editorial-standards/index.html");
  assert.match(editorial, /legal advice can be unreserved/);
  assert.match(editorial, /legislation.gov.uk\/ukpga\/2007\/29\/section\/12/);
  assert.match(editorial, /Agreement between models is not independent verification/);
});

test("llms.txt follows the llmstxt.org shape", async () => {
  const llms = await read("llms.txt");
  assert.match(llms, /^# Independent Tribunal\n\n> /);
  assert.match(llms, /## Data\n/);
  assert.match(llms, /\(https:\/\/independenttribunal\.org\/legal\/privacy\.md\)/);
  assert.match(await read("robots.txt"), /Sitemap: https:\/\/independenttribunal\.org\/sitemap\.xml/);
});

test("publishes legal nuances as data and pages", async () => {
  const { nuances } = await json("data/nuances.json");
  assert.ok(nuances.length >= 5);
  for (const n of nuances) {
    assert.ok(n.rule && n.nuance.length && n.history.length, n.id);
    for (const s of [...n.sources, ...n.history.flatMap((h) => h.sources)]) assert.match(s.url, /^https:\/\//);
    const html = await read(`nuances/${n.id}/index.html`);
    assert.match(html, /The nuance<\/h2>/);
    assert.match(html, /Not legal advice/);
  }
  assert.equal(nuances.filter((n) => n.featured).length, 4, "homepage grid holds four");
  const jury = nuances.find((n) => n.id === "jury-conscience");
  assert.ok(jury.sources.some((s) => s.url.endsWith("/ewca/crim/2026/9")));
  assert.match(await read("llms.txt"), /## Legal nuances\n/);
});

test("publishes independent tribunals with attributed findings", async () => {
  const { tribunals } = await json("data/tribunals.json");
  const ids = tribunals.map((t) => t.id);
  for (const id of ["uyghur-tribunal", "gaza-tribunal", "gaza-tribunal-uk", "belmarsh-tribunal"]) assert.ok(ids.includes(id), id);
  for (const t of tribunals) {
    assert.ok(t.legal_status && t.findings.length && t.sources.length, t.id);
    const html = await read(`independent-tribunals/${t.id}/index.html`);
    assert.match(html, /not a court's, and not ours/);
  }
  const { tiles } = await json("data/tiles.json");
  assert.ok(tiles.some((x) => x.kind === "tribunal") && tiles.some((x) => x.kind === "nuance"));
  assert.equal(tiles[0].uk, true, "UK tiles first");
});
