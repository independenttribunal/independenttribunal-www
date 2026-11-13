import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

test("the defamation game-theory study is sourced, labelled, and names nobody from the case study", async () => {
  const id = "defamation-game-theory";
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));

  assert.equal(p.id, id);
  assert.equal(p.category, "legal-study");
  assert.equal(p.checked, "2026-11-13");
  assert.equal(p.title, "The game theory of suing for defamation");
  assert.match(p.subtitle, /single insult in a small group chat/i);
  assert.match(p.status_note, /not legal advice/i);
  assert.match(p.status_note, /\[ESTIMATE\]/);
  assert.match(p.status_note, /\[JUDGMENT\]/);
  assert.match(p.scope, /not an account of a named dispute/i);
  assert.doesNotMatch(p.status_note, /\[VERIFY\]/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  const official = {
    "da-s1": "https://www.legislation.gov.uk/ukpga/2013/26/section/1",
    "da-s3": "https://www.legislation.gov.uk/ukpga/2013/26/section/3",
    "lachaux": "https://caselaw.nationalarchives.gov.uk/uksc/2019/27",
    "jameel": "https://caselaw.nationalarchives.gov.uk/ewca/civ/2005/75",
    "advfn": "https://caselaw.nationalarchives.gov.uk/ewhc/qb/2008/1797",
    "monroe": "https://caselaw.nationalarchives.gov.uk/ewhc/qb/2017/433",
    "la-s4a": "https://www.legislation.gov.uk/ukpga/1980/58/section/4A",
    "la-s32a": "https://www.legislation.gov.uk/ukpga/1980/58/section/32A",
    "pha-s7": "https://www.legislation.gov.uk/ukpga/1997/40/section/7",
    "osa-s179": "https://www.legislation.gov.uk/ukpga/2023/50/section/179",
    "osa-s181": "https://www.legislation.gov.uk/ukpga/2023/50/section/181",
    "osa-s189": "https://www.legislation.gov.uk/ukpga/2023/50/section/189",
    "pap-media": "https://www.justice.gov.uk/courts/procedure-rules/civil/protocol/prot_def",
    "cpr-44-2": "https://www.justice.gov.uk/courts/procedure-rules/civil/rules/part-44-general-rules-about-costs",
  };
  for (const [sid, url] of Object.entries(official)) {
    assert.equal(sources.get(sid).url, url, sid);
  }
  assert.match(sources.get("si-2024-31").title, /Commencement No\. 3/);
  assert.equal(sources.get("si-2024-31").url, "https://www.legislation.gov.uk/uksi/2024/31/regulation/2");

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");
  const all = p.sections.flatMap((s) => s.entries).flatMap((e) => e.paragraphs).map((x) => x.text).join(" ");

  assert.match(text("bad-trade"), /thin-skinned/);
  assert.match(text("bad-trade"), /\[JUDGMENT\]/);
  assert.match(text("serious-harm"), /actual facts about its impact/);
  assert.match(text("serious-harm"), /injury to feelings alone, however grave, will not suffice/);
  assert.match(text("vulgar-abuse"), /mere vulgar abuse/);
  assert.match(text("vulgar-abuse"), /not to be taken literally or seriously/);
  assert.match(text("monroe-counterpoint"), /condoned and approved of scrawling on war memorials/);
  assert.match(text("monroe-counterpoint"), /£24,000/);
  assert.match(text("honest-opinion"), /whether in general or specific terms/);
  assert.match(text("honest-opinion"), /did not hold the opinion/);
  assert.match(text("jameel-abuse"), /not have been worth the wick/);
  assert.match(text("time-limit"), /does not describe the discretion as “narrow/);
  assert.match(text("communications-offences"), /section 127\(2\)\(a\) and \(b\)/);
  assert.match(text("communications-offences"), /section 1\(1\)\(a\)\(ii\) and \(iii\)/);
  assert.match(text("communications-offences"), /Section 127\(1\) still/);
  assert.doesNotMatch(all, /\[VERIFY\]/);
  assert.match(text("letter-costs"), /\[ESTIMATE\]/);
  assert.match(text("trial-costs"), /\[ESTIMATE\]/);
  assert.match(text("loser-pays"), /general rule is that the unsuccessful party/);
  assert.match(text("protocol"), /in good time before proceedings are issued/);
  assert.equal(entries.get("payoff-table").table.rows.length, 3);
  assert.deepEqual(entries.get("payoff-table").table.columns, [
    "Claimant move",
    "Sympathetic in-group reading",
    "Sceptical or wider reading",
    "Main risk",
  ]);
  assert.match(entries.get("payoff-table").table.caption, /\[JUDGMENT\]/);
  assert.match(text("virtue-signalling"), /Virtue signalling/);
  assert.match(text("reverse-virtue"), /Reverse virtue signalling/);
  assert.match(text("meta-reverse"), /Meta-reverse virtue signalling/);
  assert.match(text("the-lesson"), /The offence is real, the remedy is disproportionate/);

  const quote = entries.get("authors-quote").paragraphs.find((x) => x.quote);
  assert.match(quote.text, /If anyone sues me for defamation/);
  assert.match(quote.text, /you are so ugly because your mother was raped by a dog/);
  assert.match(text("authors-quote"), /not aimed at any identifiable person/);
  assert.match(text("authors-quote"), /platform can still remove it/);
  assert.match(text("authors-quote"), /course of conduct/);
  assert.equal(entries.get("authors-quote").kind, "Author’s statement");

  // No identification of a particular Signal group or person involved.
  assert.doesNotMatch(all, /@|whatsapp|telegram/i);
  assert.match(p.scope, /semi-private group chat/);
  assert.doesNotMatch(JSON.stringify(p), /Signal group “|the Signal group named/i);

  assert.ok(p.related.some((r) => r.id === "calling-fraud-a-fraud"));
  assert.ok(p.related.some((r) => r.id === "absurdity-paradox"));

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /The game theory of suing for defamation/);
  assert.match(html, /Signalling: virtue, reverse virtue, meta-reverse virtue/);
  assert.match(html, /profile-quotation/);
  assert.match(html, /If anyone sues me for defamation/);
  assert.ok(html.includes('href="/research/calling-fraud-a-fraud/"'));
  assert.ok(html.includes('href="/research/absurdity-paradox/"'));
  assert.doesNotMatch(html, /\[VERIFY\]/);

  const category = await json("data/categories/speech-offences.json");
  const defamation = category.chapters.find((ch) => ch.title === "Defamation");
  assert.ok(defamation.links.some((l) => l.href === "/research/defamation-game-theory/"));
  const categoryHtml = await read("public/speech-offences/index.html");
  assert.ok(categoryHtml.includes('href="/research/defamation-game-theory/"'));
  assert.ok((await read("public/research/calling-fraud-a-fraud/index.html")).includes('href="/research/defamation-game-theory/"'));
  assert.ok((await read("public/research/absurdity-paradox/index.html")).includes('href="/research/defamation-game-theory/"'));
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(file)).includes("/research/defamation-game-theory/"), file);
  }
});
