import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const id = "reflective-essay-paradox-kcl-prevent";

test("reflective essay paradox: attributed account, statute, guidance, thought experiment and limits", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.pinned, undefined);
  assert.equal(p.archived, undefined);
  assert.equal(p.title, "The Reflective Essay Paradox: Niamh Grant, KCL and Prevent");
  assert.match(p.summary, /makes no finding that KCL acted unlawfully or discriminated/);
  assert.match(p.status_note, /have not been obtained/);
  for (const r of ["speech-offences", "acquittal-legal-certainty-paradox", "collateral-purpose"]) assert.ok((p.related ?? []).some((x) => x.id === r), r);

  const blob = JSON.stringify(p);
  assert.doesNotMatch(blob, /Review log|Corrections log|confirmed by/);
  assert.match(blob, /appears to be the basis/);
  assert.match(blob, /Where does legitimate reflection end and compelled ideological conformity begin/);
  assert.match(blob, /particular regard/);
  assert.match(blob, /section 43\(1\) of the Education \(No\. 2\) Act 1986/);
  assert.match(blob, /section A1\(1\) of the Higher Education and Research Act 2017/);
  assert.match(blob, /“one consistent and proportionate threshold/);
  assert.match(blob, /not a duty to achieve the aim|is not a duty to achieve the aim/);
  assert.match(blob, /amended the three-step framework/);
  assert.match(blob, /categories overlap and sum to more than 10,293/);
  assert.match(blob, /not an NAO-stated percentage/);
  assert.match(blob, /not proof of discrimination/i);
  assert.match(blob, /subject access request/);
  assert.match(blob, /does not apply here/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("novara").url, "https://novaramedia.com/2026/11/26/kings-college-london-made-a-pro-palestine-student-write-an-essay-as-punishment-then-reported-her-to-prevent-for-it/");
  assert.equal(sources.get("ctsa-s31").url, "https://www.legislation.gov.uk/ukpga/2015/6/section/31");
  assert.equal(sources.get("ofs-aug26").date, "2026-08-05");
  assert.equal(sources.get("ho-stats").date, "2026-08-06");

  const table = p.sections.find((s) => s.id === "counterfactual").entries[0].table;
  assert.equal(table.rows.length, 7);
  assert.ok(table.rows.some((r) => /Jesus/.test(r[0])) && table.rows.some((r) => /Socrates/.test(r[0])) && table.rows.some((r) => /Martin Luther King/.test(r[0])));
  assert.equal(p.sections.find((s) => s.id === "foi").entries[0].table.rows.length, 10);

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /<h1>The Reflective Essay Paradox: Niamh Grant, KCL and Prevent<\/h1>/);
  assert.match(html, /id="satire-clause"/);
  assert.match(html, /id="counterfactual"/);
  for (const href of ["speech-offences", "acquittal-legal-certainty-paradox", "collateral-purpose"]) assert.ok(html.includes(`href="/research/${href}/"`), href);
  const firstCitations = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(firstCitations, p.sources.map((_, i) => i + 1));

  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === id).kind, "study");
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt"]) assert.ok((await read(file)).includes(`/research/${id}/`), file);

  const speech = await json("data/profiles/speech-offences.json");
  assert.ok((speech.related ?? []).some((r) => r.id === id));
  const acq = await json("data/profiles/acquittal-legal-certainty-paradox.json");
  assert.ok((acq.related ?? []).some((r) => r.id === id));
});
