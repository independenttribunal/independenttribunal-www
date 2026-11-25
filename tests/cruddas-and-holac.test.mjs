import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const entriesOf = (p) => new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
const textOf = (entries, id) => entries.get(id).paragraphs.map((x) => x.text).join(" ");

test("Peter Cruddas page: override, mixed libel result, dates, donations and limits", async () => {
  const p = await json("data/profiles/peter-cruddas.json");
  validateProfile(p, (message) => assert.fail(message));
  assert.notEqual(p.category, "legal-study");
  assert.equal(p.title, "Peter Cruddas: the peerage HOLAC would not support");
  assert.match(p.scope, /not a finding of dishonesty, of a sale of honours/);
  assert.match(p.status_note, /have not seen HOLAC’s confidential vetting file/);

  const related = (p.related ?? []).map((r) => r.id);
  assert.ok(related.includes("house-of-lords-appointments-commission"));
  assert.ok(related.includes("evgeny-lebedev-peerage-and-media-ownership"));

  const entries = entriesOf(p);
  const text = (id) => textOf(entries, id);

  assert.match(text("the-override"), /could not support one nominee – Peter Cruddas/);
  assert.match(text("the-override"), /first occasion on which its advice has not been followed/);
  assert.match(text("johnsons-letter"), /most serious accusations levelled at the time were found to be untrue and libellous/);
  assert.match(text("johnsons-letter"), /have not audited the foundation’s accounts/);
  assert.match(text("creation-and-introduction"), /27 January 2021/);
  assert.match(text("creation-and-introduction"), /2 February 2021/);
  assert.match(text("creation-and-introduction"), /Baron Cruddas, of Shoreditch in the London Borough of Hackney/);

  assert.match(text("high-court"), /£180,000/);
  assert.match(text("high-court"), /£15,000/);
  assert.match(text("court-of-appeal"), /meaning 1 was substantially true/);
  assert.match(text("court-of-appeal"), /£50,000/);
  assert.match(text("court-of-appeal"), /not suggesting any form of criminal offence under the Bribery Act 2010/);
  assert.match(text("the-articles"), /regrets signing that letter/);
  assert.match(text("the-summary-question"), /does not mention that meaning 1 had been held substantially true/);
  assert.match(text("the-summary-question"), /do not infer from that omission that the Prime Minister sought to mislead/);

  assert.match(text("register-totals"), /£3,340,274.66/);
  assert.match(text("register-totals"), /£50,000 cash donation to Mr Boris Johnson MP accepted on 6 June 2019/);
  assert.match(text("register-totals"), /£500,000 cash donation, received on 5 February 2021 and accepted on 8 February 2021/);
  assert.match(text("register-totals"), /do not, without more, establish that the peerage was offered or accepted in return for a payment/);
  assert.match(text("how-they-differ"), /Crossbench life peerage, not a party-political one/);
  assert.match(text("limits"), /do not say that Lord Cruddas bought a peerage/);

  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("ca-2015").date, "2015-03-17");
  assert.match(sources.get("ca-2015").url, /caselaw\.nationalarchives\.gov\.uk\/ewca\/civ\/2015\/171/);
  assert.match(sources.get("hc-2013").url, /caselaw\.nationalarchives\.gov\.uk\/ewhc\/qb\/2013\/2298/);
  assert.match(sources.get("holac-pacac").url, /2020-12-22-Chair-of-HOLAC-to-PACAC-Peter-Cruddas-peerage\.pdf/);

  const html = await read("public/research/peter-cruddas/index.html");
  assert.match(html, /<h1>Peter Cruddas: the peerage HOLAC would not support<\/h1>/);
  assert.doesNotMatch(html, /id="satire-clause"/);
  assert.ok(html.includes('href="/research/house-of-lords-appointments-commission/"'));
  assert.ok(html.includes('href="/research/evgeny-lebedev-peerage-and-media-ownership/"'));
  assert.ok(html.includes('href="/people/"'));
});

test("HOLAC page: advisory remit, cases, applications, reform and satire clause", async () => {
  const p = await json("data/profiles/house-of-lords-appointments-commission.json");
  validateProfile(p, (message) => assert.fail(message));
  assert.equal(p.category, "legal-study");
  assert.equal(p.title, "The House of Lords Appointments Commission");
  assert.match(p.scope, /not a finding that any named person was unfit/);

  const related = (p.related ?? []).map((r) => r.id);
  assert.ok(related.includes("peter-cruddas"));
  assert.ok(related.includes("evgeny-lebedev-peerage-and-media-ownership"));

  const entries = entriesOf(p);
  const text = (id) => textOf(entries, id);

  assert.match(text("established"), /4 May 2000/);
  assert.match(text("established"), /not created by statute/);
  assert.match(text("two-functions"), /does not, on the present remit, assess the suitability or merit of party nominees/);
  assert.match(text("no-veto"), /provides advice but does not have a veto/);
  assert.match(text("cruddas-case"), /first occasion on which its advice has not been followed/);
  assert.match(text("cruddas-case"), /accepted on all but one occasion in 2020/);
  assert.match(text("lebedev-case"), /ultimately did not say no/);
  assert.match(text("lebedev-case"), /denied being a Russian agent or a security risk/);
  assert.match(text("resignation-list-2023"), /had not supported eight nominees/);
  assert.match(text("resignation-list-2023"), /Rishi Sunak, accepted that advice/);
  assert.match(text("open-process"), /open, merit-based process/);
  assert.match(text("open-process"), /just over 1%/);
  assert.match(text("open-process"), /taking the House, and appointment to it, seriously/);
  assert.match(text("the-proposals"), /did not progress further/);
  assert.match(text("design-questions"), /These are research questions about institutional design/);
  assert.match(text("limits"), /does not find that any named person was unfit for the House/);
  assert.doesNotMatch(JSON.stringify(p), /advice has been accepted\. \[39\]/);

  const html = await read("public/research/house-of-lords-appointments-commission/index.html");
  assert.match(html, /<h1>The House of Lords Appointments Commission<\/h1>/);
  assert.match(html, /id="satire-clause"/);
  assert.match(html, /militarised satire/);
  assert.ok(html.includes('href="/research/peter-cruddas/"'));
  assert.ok(html.includes('href="/research/evgeny-lebedev-peerage-and-media-ownership/"'));
});

test("Lebedev page now points to the Cruddas and HOLAC studies, without treating the cases as the same", async () => {
  const p = await json("data/profiles/evgeny-lebedev-peerage-and-media-ownership.json");
  validateProfile(p, (message) => assert.fail(message));
  const related = (p.related ?? []).map((r) => r.id);
  assert.ok(related.includes("peter-cruddas"));
  assert.ok(related.includes("house-of-lords-appointments-commission"));

  const entries = entriesOf(p);
  const comparator = textOf(entries, "cruddas-comparator");
  assert.match(comparator, /does not establish that the same final advice was given in Lebedev’s case/);
  assert.match(comparator, /Peter Cruddas/);
  assert.match(comparator, /House of Lords Appointments Commission/);

  const html = await read("public/research/evgeny-lebedev-peerage-and-media-ownership/index.html");
  assert.ok(html.includes('href="/research/peter-cruddas/"'));
  assert.ok(html.includes('href="/research/house-of-lords-appointments-commission/"'));
});

test("the new pages are discoverable in the right indexes", async () => {
  const people = await read("public/people/index.html");
  assert.ok(people.includes("/research/peter-cruddas/"));
  assert.ok(!people.includes("/research/house-of-lords-appointments-commission/"));

  const research = await read("public/research/index.html");
  assert.ok(research.includes("/research/peter-cruddas/"));
  assert.ok(research.includes("/research/house-of-lords-appointments-commission/"));

  for (const file of ["public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    const text = await read(file);
    assert.ok(text.includes("/research/peter-cruddas/"), file);
    assert.ok(text.includes("/research/house-of-lords-appointments-commission/"), file);
  }

  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === "peter-cruddas").kind, "profile");
  assert.ok(tiles.find((t) => t.id === "peter-cruddas").tags.includes("people"));
  assert.equal(tiles.find((t) => t.id === "house-of-lords-appointments-commission").kind, "study");
  assert.ok(!tiles.find((t) => t.id === "house-of-lords-appointments-commission").tags.includes("people"));
});
