import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

const id = "shand-v-kemkers";

test("Shand v Kemkers: holding, first-case qualification, cross-links and sources", async () => {
  const p = await json(`data/profiles/${id}.json`);
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "A lawyer is not an investigator of the client’s case: Shand v Kemkers");
  assert.match(p.summary, /not the first case/);
  assert.match(p.scope, /England and Wales/);
  assert.match(p.status_note, /\[2023\] EWCA Civ 785/);
  assert.match(p.status_note, /\[2023\] EWCA Civ 783/);
  assert.ok((p.related ?? []).some((r) => r.id === "frameworks-of-truth"));
  assert.ok((p.related ?? []).some((r) => r.id === "robinson-v-murphy"));

  const entries = new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  const text = (entryId) => entries.get(entryId).paragraphs.map((x) => x.text).join(" ");

  assert.match(text("what-was-held"), /totally without merit/);
  assert.match(text("what-was-held"), /extended civil restraint order/);
  assert.match(text("what-was-not-decided"), /did not find that any of the six respondents had committed a contempt/);
  assert.match(text("what-was-not-decided"), /did not decide whether a client had knowingly given false instructions/);
  assert.match(text("not-a-first"), /first case of its kind/);
  assert.match(text("not-a-first"), /existing proceedings/);
  assert.equal(entries.get("not-a-first").kind, "Our analysis — not a judicial finding");

  assert.match(text("the-application"), /226 pages/);
  assert.match(text("2019-and-2020"), /£290,000/);
  assert.match(text("shand-case"), /egregious multi-party fraud on the court/);
  assert.match(text("defendants-case"), /wholly unfounded/);

  assert.match(text("knowledge"), /\[2023\] EWCA Civ 785/);
  assert.match(text("knowledge"), /\[2023\] EWCA Civ 783/);
  assert.match(text("not-vouching"), /not personally vouching/);
  assert.match(text("not-vouching"), /no general or overarching duty to investigate/);
  assert.equal(entries.get("not-vouching").paragraphs.some((para) => para.quote && para.text.includes("not personally vouching")), true);
  assert.match(text("privilege"), /\[2003\] 1 AC 120/);
  assert.match(text("ecro"), /CPR 3\.4\(6\)/);
  assert.match(text("ecro"), /CPR 33\.4 \(6\)/);
  assert.match(text("mishcon-2291"), /given its quietus/);
  assert.match(text("mishcon-2291"), /1 June 2022/);

  assert.match(text("the-hypothetical"), /not a finding about these parties|does not find that any such thing happened here/);
  assert.match(text("for-journalists"), /not, on the official text/);
  assert.doesNotMatch(JSON.stringify(p), /Review log|Corrections log|confirmed by/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.match(sources.get("judgment").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewhc\/kb\/2026\/341/);
  assert.match(sources.get("mishcon-2291").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewhc\/kb\/2026\/2291/);
  assert.match(sources.get("norman").url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\/ewca\/civ\/2023\/785/);
  assert.equal(sources.get("judgment").date, "2026-02-18");
  assert.equal(sources.get("mishcon-2291").date, "2026-09-11");

  const html = await read(`public/research/${id}/index.html`);
  assert.match(html, /<section class="profile-related" id="related">/);
  assert.ok(html.includes('href="/research/frameworks-of-truth/"'));
  assert.ok(html.includes('href="/research/robinson-v-murphy/"'));
  assert.match(html, /id="satire-clause"/);
  assert.match(html, /militarised satire/);
  assert.ok(html.includes("Counter-strategy"));
  assert.ok(!/False Instructions, Innocent Advocacy/i.test(html));

  const frameworks = await json("data/profiles/frameworks-of-truth.json");
  assert.ok((frameworks.related ?? []).some((r) => r.id === id));
  const fwEntries = new Map(frameworks.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
  assert.ok(fwEntries.has("shand-v-kemkers"));
  const fwText = fwEntries.get("shand-v-kemkers").paragraphs.map((x) => x.text).join(" ");
  assert.match(fwText, /not the first case to state it/);
  const fwHtml = await read("public/research/frameworks-of-truth/index.html");
  assert.ok(fwHtml.includes('href="/research/shand-v-kemkers/"'));
  assert.ok(fwHtml.includes("Shand v Kemkers"));

  const robinson = await json("data/profiles/robinson-v-murphy.json");
  assert.ok((robinson.related ?? []).some((r) => r.id === id));
  const robHtml = await read("public/research/robinson-v-murphy/index.html");
  assert.ok(robHtml.includes('href="/research/shand-v-kemkers/"'));
});
