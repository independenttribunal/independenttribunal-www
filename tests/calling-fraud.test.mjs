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

test("McAlpine: the tweet is quoted as the judgment spells it, with a spelling note", async () => {
  const p = JSON.parse(await readFile(new URL("../data/profiles/calling-fraud-a-fraud.json", import.meta.url), "utf8"));
  const entry = p.sections.flatMap((s) => s.entries).find((e) => e.id === "innocent-face");
  const text = entry.paragraphs.map((x) => x.text).join(" ");
  assert.ok(text.includes("“Why is Lord McAlpine trending? *Innocent face*”"));
  assert.match(text, /Spelling note \[sic!\]/);
  assert.match(text, /IS \[sic\] not taking sides/);
  const jigsaw = p.sections.flatMap((s) => s.entries).find((e) => e.id === "jigsaw");
  assert.match(jigsaw.paragraphs[0].text, /the last piece in the jigsaw/);
});

test("fraud study: corrections keep the defences, Chase levels and SLAPP conditions precise", async () => {
  const p = JSON.parse(await readFile(new URL("../data/profiles/calling-fraud-a-fraud.json", import.meta.url), "utf8"));
  const all = JSON.stringify(p);
  assert.doesNotMatch(all, /Truth only/);
  assert.doesNotMatch(all, /is, in law, calling it a fraud/);
  assert.match(all, /all four conditions in section 195\(1\)/);
  assert.match(all, /not rigid boxes/);
  assert.match(p.summary, /more likely than not to succeed/);
  const policy = await readFile(new URL("../data/policies/editorial-standards.md", import.meta.url), "utf8");
  assert.match(policy, /## Right of reply/);
});
