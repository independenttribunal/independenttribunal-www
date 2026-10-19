import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCommentary } from "../scripts/commentary.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("mental-health commentary preserves evidence boundaries and supplied figures", async () => {
  const p = await json("data/commentary/mental-health-uk.json");
  const errors = [];
  validateCommentary(p, (error) => errors.push(error));
  assert.deepEqual(errors, []);
  assert.equal(p.title, "Mental health in the UK");
  assert.match(p.headline, /If you are crazy, that’s normal/);
  assert.equal(p.scale_figures.length, 10);
  assert.equal(p.evidence_frame.number_of_accounts, null);
  assert.match(p.evidence_frame.interpretation, /do not establish/);
  assert.equal(Object.values(p.unknowns).filter((value) => value === null).length, 4);
  assert.match(p.image.caption, /not an official NHS poster/);
  assert.equal(p.sources.length, 11);
  assert.deepEqual(p.sources.map((s) => s.number), Array.from({ length: 11 }, (_, i) => i + 1));
  assert.deepEqual([...new Set([...p.scale_figures, ...p.legal_context].flatMap((x) => x.source_numbers))], p.sources.map((s) => s.number));
  assert.equal(p.scale_figures.find((f) => f.unit === "percent" && f.value === 39).scope, "Normal-rules Personal Independence Payment claims, England and Wales; not population prevalence, a work-capacity measure or a fraud estimate.");
  assert.equal(Math.round(9121000 / .209 / 100000) * 100000, p.scale_figures[1].value);
  assert.equal(Math.round(2070000 / 6210000 * 1000) / 10, 33.3);
});

test("commentary page renders its image, contextual labels, citations and section links", async () => {
  const html = await read("public/research/mental-health-uk/index.html");
  const p = await json("data/commentary/mental-health-uk.json");
  assert.match(html, /<h1>Mental health in the UK<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/independenttribunal.org\/research\/mental-health-uk\/"/);
  assert.match(html, /width="1181" height="1331"/);
  assert.match(html, /aria-describedby="artwork-caption"/);
  assert.ok(html.indexOf("Satire, not an NHS notice") < html.indexOf("<img"));
  assert.match(html, /not an official NHS poster/);
  assert.match(html, /A hypothesis to test—not a finding/);
  assert.match(html, /Unknown is not zero/);
  assert.match(html, /not a latest-release dashboard/i);
  for (const s of p.sources) {
    const url = s.url.replaceAll("&", "&amp;");
    assert.ok(html.includes(`id="source-${s.number}">[${s.number}]`), s.title);
    const links = [...html.matchAll(/<a\b[^>]*>/g)].map((x) => x[0]).filter((x) => x.includes(`href="${url}"`));
    assert.ok(links.length >= 2, s.title);
    for (const link of links) {
      assert.match(link, /target="_blank"/);
      assert.match(link, /rel="noopener noreferrer"/);
      assert.match(link, /opens in a new tab/);
    }
  }
  assert.doesNotMatch(html, /A private contact address is being set up|Independent Tribunal is not a court/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  const png = await readFile(new URL(`../public${p.image.src}`, import.meta.url));
  assert.equal(png.readUInt32BE(16), p.image.width);
  assert.equal(png.readUInt32BE(20), p.image.height);
});

test("commentary is discoverable without becoming a profile or historical dossier", async () => {
  const p = await json("public/data/commentary/mental-health-uk.json");
  assert.equal(p.url, "https://independenttribunal.org/research/mental-health-uk/");
  assert.deepEqual((await json("public/data/commentary.json")).commentary, [p]);
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) assert.ok((await read(file)).includes("/research/mental-health-uk/"), file);
  assert.equal((await json("public/data/tiles.json")).tiles.find((t) => t.id === p.id).kind, "commentary");
  assert.equal((await json("public/data/index.json")).datasets.find((d) => d.id === "commentary").count, 1);
  assert.equal((await json("public/data/research.json")).research.length, 6);
  const profiles = (await json("public/data/profiles.json")).profiles;
  assert.equal(profiles.length, 10);
  assert.ok(!profiles.some((profile) => profile.id === p.id));
});

test("commentary validation rejects unsafe sources, absent context and invented unknown values", async () => {
  const original = await json("data/commentary/mental-health-uk.json");
  for (const [mutate, pattern] of [
    [(p) => { p.image.caption = ""; }, /image requires/],
    [(p) => { p.image.src = "javascript:alert(1)"; }, /safe path/],
    [(p) => { p.scale_figures[0].source_numbers = [999]; }, /unknown source/],
    [(p) => { p.legal_context[0].source_numbers = []; }, /requires sources/],
    [(p) => { p.sources[0].url = "javascript:alert(1)"; }, /source metadata/],
    [(p) => { p.sources[0].number = 28; }, /consecutive from 1/],
    [(p) => { p.scale_figures[0].source_numbers = [2]; }, /order of first citation/],
    [(p) => { p.unknowns.current_complete_PIP_chain_workforce = 0; }, /labelled nulls/],
  ]) {
    const p = structuredClone(original);
    mutate(p);
    const errors = [];
    validateCommentary(p, (error) => errors.push(error));
    assert.match(errors.join("\n"), pattern);
  }
});
