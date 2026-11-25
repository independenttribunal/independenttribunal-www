import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

const id = "robinson-v-murphy";

test("Robinson v Murphy: holding, quotes, corrections and cross-links are on the page", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "False statement of truth, not a lie: Robinson v Murphy");
  assert.match(p.scope, /County Court at Manchester/);
  assert.match(p.scope, /81\.3\(8\)/);
  assert.match(p.status_note, /not found a published CILEx Regulation or Solicitors Regulation Authority decision/);
  assert.match(p.status_note, /creditors’ voluntary liquidation/);
  assert.match(p.status_note, /do not infer one/);
  assert.ok((p.related ?? []).some((r) => r.id === "frameworks-of-truth"));

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("what-was-held"), /without an honest belief in their truth/);
  assert.match(text("what-was-not-decided"), /was not pursued/);
  assert.match(text("what-was-not-decided"), /recklessly/);
  assert.match(text("what-was-not-decided"), /no finding either way on recklessness or carelessness/);
  assert.match(text("core-takeaway"), /Proof of falsehood is not proof of dishonesty/);
  assert.equal(entries.get("core-takeaway").kind, "Our analysis — not a judicial finding");

  // Verified facts and corrections against the judgment
  assert.match(text("the-accident"), /16 November 2019/);
  assert.match(text("the-accident"), /19 November 2019/);
  assert.match(text("robinson-role"), /Fellow of the Chartered Institute of Legal Executives/);
  assert.match(text("two-statements"), /£3,100/);
  assert.match(text("two-statements"), /£3,916/);
  assert.match(text("two-statements"), /£3,960/);
  assert.match(text("robinsons-case"), /It was also Mr Boyle, not counsel for Mr Murphy/);
  assert.match(text("criminal-standard"), /\[2024\] EWCA Civ 268/);
  assert.match(text("criminal-standard"), /\[2024\] EWCA Civ 265 is a different case/);
  assert.match(text("the-dismissal"), /has not been proved the requisite criminal standard/);
  assert.equal(entries.get("the-dismissal").paragraphs.some((para) => para.quote && para.text.includes("reasonable doubts")), true);
  assert.match(text("norman-knowledge"), /he knew that he did not know whether what he said was true or not/);
  assert.match(text("the-firm"), /do not infer one/);
  assert.doesNotMatch(text("open-questions") + text("limits"), /Enquiry sent by the researcher/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.match(sources.get("judgment").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewhc\/kb\/2024\/798/);
  assert.match(sources.get("norman").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewca\/civ\/2023\/785/);
  assert.match(sources.get("navigator").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewca\/civ\/2024\/268/);
  assert.equal(sources.get("norman").date, "2023-07-07");

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /<section class="profile-related" id="related">/);
  assert.ok(html.includes('href="/research/frameworks-of-truth/"'));
  assert.match(html, /id="satire-clause"/);
  assert.match(html, /militarised satire/);

  const frameworks = await json("data/profiles/frameworks-of-truth.json");
  assert.ok((frameworks.related ?? []).some((r) => r.id === id));
  const fwEntries = new Map(frameworks.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  assert.ok(fwEntries.has("robinson-v-murphy"));
  const fwHtml = await read("public/research/frameworks-of-truth/index.html");
  assert.ok(fwHtml.includes('href="/research/robinson-v-murphy/"'));
  assert.ok(fwHtml.includes("Robinson v Murphy"));
});
