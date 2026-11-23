import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the new pornography offences study is a sourced legal study with the cheeky table and satire footer", async () => {
  const p = await json("data/profiles/new-pornography-offences.json");
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "New pornography offences in the UK");
  assert.ok(p.tags.includes("pornography"));
  assert.ok(p.tags.includes("online-safety"));
  assert.deepEqual(p.sections.map((s) => s.id), [
    "sources-legislation",
    "the-offences",
    "existing-law",
    "do-versus-record",
    "cheeky-table",
  ]);

  const relatedIds = (p.related ?? []).map((r) => r.id);
  for (const id of ["speech-offences", "defamation-game-theory", "absurdity-paradox"]) {
    assert.ok(relatedIds.includes(id), id);
    const other = await json(`data/profiles/${id}.json`);
    assert.ok((other.related ?? []).some((r) => r.id === "new-pornography-offences"), id);
  }

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("cpa-104").url, "https://www.legislation.gov.uk/ukpga/2026/20/section/104");
  assert.equal(sources.get("si-1090").url, "https://www.legislation.gov.uk/uksi/2026/1090/regulation/2");
  assert.equal(sources.get("cpa-sch13").url, "https://www.legislation.gov.uk/ukpga/2026/20/schedule/13");
  assert.equal(sources.get("soa-66e").url, "https://www.legislation.gov.uk/ukpga/2003/42/section/66E");
  assert.match(sources.get("si-31").title, /Commencement No\. 5/);

  const text = JSON.stringify(p);
  assert.match(text, /so far as they extend to England and Wales/);
  assert.match(text, /remains prospective/);
  assert.match(text, /section 66E/);
  assert.match(text, /titled “Exposure”/);
  assert.match(text, /question of fact/);
  assert.match(text, /We do not suggest, we do not advocate, we do not support, we do not find enjoyable in any way, shape or form/);
  assert.match(text, /Talking about the law should not be an offence/);
  assert.doesNotMatch(text, /Corrections to the supplied|What remains unverified|supplied analysis|supplied notes|v02|now confirmed|deeper analysis|primary-source confirmation|Updated calibration|open items now closed/i);

  const ids = p.sections.flatMap((s) => [s.id, ...s.entries.map((e) => e.id)]);
  assert.ok(!ids.includes("corrections"));
  assert.ok(!ids.includes("open-verification"));

  const html = await read("public/research/new-pornography-offences/index.html");
  assert.match(html, /<h1>New pornography offences in the UK<\/h1>/);
  assert.match(html, /id="cheeky-table"/);
  assert.match(html, /id="satire-clause"/);
  assert.ok(html.indexOf('id="sources-legislation"') < html.indexOf('id="the-offences"'));
  assert.ok(html.indexOf('id="the-offences"') < html.indexOf('id="existing-law"'));
  assert.ok(html.indexOf('id="existing-law"') < html.indexOf('id="do-versus-record"'));
  assert.ok(html.indexOf('id="do-versus-record"') < html.indexOf('id="cheeky-table"'));
  assert.ok(html.indexOf('id="cheeky-table"') < html.indexOf('id="satire-clause"'));
  assert.match(html, /Cheeky table/);
  assert.match(html, /A short scorecard/);
  assert.doesNotMatch(html, /Corrections to the supplied analysis|What remains unverified/);
  assert.match(html, /rel="canonical" href="https:\/\/independenttribunal.org\/research\/new-pornography-offences\/"/);
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(file)).includes("/research/new-pornography-offences/"), file);
  }
});
