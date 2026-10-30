import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the fraud study rests on primary sources and keeps its specimens labelled as specimens", async () => {
  const p = await json("data/profiles/calling-fraud-a-fraud.json");
  validateProfile(p, (message) => assert.fail(message));
  for (const s of p.sources) assert.match(s.url, /^https:\/\/(www\.legislation\.gov\.uk|caselaw\.nationalarchives\.gov\.uk)\//, s.id);
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  // The supplied draft misnamed this case.
  assert.match(sources.get("stocker").title, /^Stocker v Stocker/);
  const sections = new Map(p.sections.map((s) => [s.id, s]));
  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");
  assert.match(text("dishonesty-is-fact"), /a bare allegation of dishonesty will normally be analysed as an allegation of fact/);
  assert.match(text("riley-lesson"), /£10,000/);
  assert.match(text("bogus"), /Orwellian ministry of truth/);
  // Specimen accusations only ever appear inside labelled analysis.
  assert.match(sections.get("specimens").intro, /not statements by Independent Tribunal/);
  for (const id of ["specimen-table", "jail", "jigsaw", "own-risk", "corrections"]) assert.equal(entries.get(id).kind, "Our analysis", id);
  assert.match(entries.get("rules").kind, /not legal advice/);
  assert.match(p.status_note, /Nothing on this page says that any person or company committed fraud/);
  const html = await read("public/research/calling-fraud-a-fraud/index.html");
  assert.ok(html.includes('href="/research/thames-water/"'));
  assert.ok((await read("public/research/thames-water/index.html")).includes('href="/research/calling-fraud-a-fraud/"'));
});
