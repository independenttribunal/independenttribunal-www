import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";
import { validateCategory } from "../scripts/categories.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const entriesOf = (p) => new Map(p.sections.flatMap((s) => s.entries).map((e) => [e.id, e]));
const textOf = (entry) => entry.paragraphs.map((x) => x.text).join(" ");

test("the grossly offensive chapter quotes Collins and Cobban verbatim and keeps commentary labelled", async () => {
  const p = await json("data/profiles/grossly-offensive.json");
  validateProfile(p, (message) => assert.fail(message));
  const sources = new Map(p.sources.map((s) => [s.id, s]));
  assert.equal(sources.get("collins").url, "https://publications.parliament.uk/pa/ld200506/ldjudgmt/jd060719/collin-1.htm");
  for (const id of ["cobban", "chambers"]) assert.match(sources.get(id).url, /^https:\/\/caselaw\.nationalarchives\.gov\.uk\//);
  const e = entriesOf(p);
  const quotes = (id) => e.get(id).paragraphs.filter((x) => x.quote).map((x) => x.text);
  // Verbatim from the House of Lords text, paras 7, 8 and 9.
  assert.ok(quotes("public-network").some((q) => q.includes("to prohibit the use of a service provided and funded by the public for the benefit of the public")));
  assert.ok(quotes("public-network").some((q) => q.startsWith("“The offence is complete when the message is sent.")));
  assert.ok(quotes("the-standard")[0].includes("reasonably enlightened, but not perfectionist, contemporary standards"));
  assert.ok(quotes("two-racists")[0].includes("one racist talking on the telephone to another"));
  // Cobban para 110, the privacy sentence the chapter turns on.
  assert.ok(quotes("expectation").some((q) => q.includes("very likely to have a reasonable expectation of privacy")));
  assert.match(textOf(e.get("cloud")), /stored in an online facility and not seen by others/);
  // Our reasoning is labelled as ours, and the press-reported verdict says reports differ.
  for (const id of ["reasonable", "cloud-analysis", "absurdity-lesson"]) assert.equal(e.get(id).kind, "Our commentary");
  assert.match(e.get("gibbins").kind, /Press reporting/);
  assert.match(textOf(e.get("gibbins")), /we record both until the court record is available/);
  assert.match(textOf(e.get("cloud-analysis")), /We found no reported prosecution/);
  // Slurs are described, not repeated.
  assert.doesNotMatch(JSON.stringify(p), /Wogs|Pakis|Niggers/i);
});

test("the absurdity paradox separates libel hurdles from criminal offences", async () => {
  const p = await json("data/profiles/absurdity-paradox.json");
  validateProfile(p, (message) => assert.fail(message));
  const e = entriesOf(p);
  assert.equal(e.get("the-sentence").paragraphs[0].text, "“You are so ugly because your mother was raped by a dog.”");
  assert.ok(e.get("no-publication").paragraphs[0].text.includes("publication to one or more third parties"));
  assert.match(textOf(e.get("vulgar-abuse")), /mere vulgar abuse/);
  assert.equal(e.get("paradox-table").table.rows.length, 5);
  for (const id of ["where-it-fails", "reasonable-person"]) assert.equal(e.get(id).kind, "Our commentary");
});

test("message ultra describes the threat and the support in brackets instead of writing them", async () => {
  const p = await json("data/profiles/message-ultra.json");
  validateProfile(p, (message) => assert.fail(message));
  const e = entriesOf(p);
  const message = e.get("ultra-text").paragraphs[0].text;
  for (const part of ["[A threat to kill the recipient.]", "[An opinion praising a proscribed organisation.]", "[A claim the sender knows is false, chosen to frighten the recipient.]"]) assert.ok(message.includes(part), part);
  // No real organisation is named in the message, and no threat is written out.
  assert.doesNotMatch(message, /Hamas|Palestine Action|Hezbollah|I will kill|I'll kill/i);
  const table = e.get("layers-table").table;
  assert.equal(table.rows.length, 6);
  assert.deepEqual(table.rows.map((r) => r[1].split(",")[0]), ["Communications Act 2003", "Malicious Communications Act 1988", "Online Safety Act 2023", "Online Safety Act 2023", "Terrorism Act 2000", "Protection from Harassment Act 1997"]);
  assert.match(p.status_note, /would not normally bring all six/);
});

test("the speech offences category links only to pages and anchors that exist", async () => {
  const c = await json("data/categories/speech-offences.json");
  assert.deepEqual(c.chapters.map((ch) => ch.title), ["Grossly offensive", "Private chats and cloud notes", "Supporting Hamas", "Supporting Palestine Action", "Defamation", "“Your mother was raped by a dog”", "Message ultra", "What we can say, and what we can’t", "Reform tracker", "The case register"]);
  const html = await read("public/speech-offences/index.html");
  for (const ch of c.chapters) assert.ok(html.includes(`href="${ch.href}"`), ch.href);
  assert.match(html, /Nothing here supports any proscribed organisation/);
  assert.ok((await read("public/sitemap.xml")).includes("https://independenttribunal.org/speech-offences/"));
  assert.ok((await read("public/llms.txt")).includes("[Speech offences](https://independenttribunal.org/speech-offences/)"));
  assert.ok((await read("public/llms-full.txt")).includes("Message ultra <https://independenttribunal.org/research/message-ultra/>"));
  assert.equal((await json("public/data/categories/speech-offences.json")).chapters.length, 10);
  assert.ok((await json("data/navigation.json")).links.some((l) => l.href === "/speech-offences/"));
  // The validator rejects a missing page and a missing anchor.
  const errors = [];
  const targets = new Map([["/research/grossly-offensive/", new Set(["private"])]]);
  validateCategory({ ...c, file: "speech-offences.json", chapters: [{ title: "x", summary: "y", href: "/research/grossly-offensive/#nowhere" }, { title: "x", summary: "y", href: "/research/missing/" }], related: [] }, targets, (_, m) => errors.push(m));
  assert.deepEqual(errors, ["unknown anchor /research/grossly-offensive/#nowhere", "unknown page /research/missing/"]);
});

test("the reporting-limits chapter keeps the live case to procedural facts and the law", async () => {
  const p = await json("data/profiles/reporting-limits.json");
  validateProfile(p, (message) => assert.fail(message));
  const e = entriesOf(p);
  const quotes = (id) => e.get(id).paragraphs.filter((x) => x.quote).map((x) => x.text);
  // Verbatim statute and Supreme Court text.
  assert.ok(quotes("strict-liability")[0].includes("regardless of intent to do so"));
  assert.ok(quotes("fair-reports").some((q) => q.includes("merely incidental to the discussion")));
  assert.ok(quotes("context")[0].includes("would not constitute the expression of an opinion which was supportive of Hamas"));
  assert.equal(e.get("seven-elements").table.rows.length, 7);
  // Four categories, separating law from house policy, in order.
  assert.deepEqual(e.get("the-boxes").table.rows.map((r) => r[0]), ["Legally restricted", "Potentially prejudicial", "Protected discussion, with conditions", "Withheld by choice"]);
  // Explaining the law: the CPS sentence verbatim, and our assumption labelled as ours.
  assert.ok(quotes("cps-para-35")[0].startsWith("“For the avoidance of doubt, a person who does not do anything other than provide information"));
  assert.equal(e.get("our-assumption").kind, "Our commentary");
  // Both halves of the Supreme Court ruling.
  assert.ok(quotes("compatibility")[0].includes("the interference with freedom of expression is in principle justifiable"));
  assert.match(textOf(e.get("compatibility")), /All five justices agreed/);
  // Section 5 and linking are conditional, not automatic.
  assert.match(textOf(e.get("section-5-limits")), /does not earn the protection by calling itself research/);
  assert.match(textOf(e.get("our-rule")), /a link alone does not prove the offence/);
  assert.match(textOf(e.get("restrictions-here")), /We intend to ask/);
  // The live case: no disputed post text, no link to it, no characterisation.
  const page = JSON.stringify(p);
  assert.doesNotMatch(page, /infiltration|x\.com|twitter\.com|AdvAKBhatti|swilki/i);
  assert.match(textOf(e.get("can-say")), /That is all we report from the hearings/);
  for (const id of ["cannot-say", "not-saying"]) assert.equal(e.get(id).kind, "Coverage limitation");
  // What we hold back is named in an embargo frame, without the wording, the date or a link.
  const frame = e.get("not-saying").paragraphs.find((x) => x.embargo);
  assert.match(frame.text, /further material that we are not publishing while proceedings are active/);
  assert.match(frame.text, /does not mean it is relevant, admissible or incriminating/);
  assert.deepEqual(frame.sources, []);
  assert.doesNotMatch(JSON.stringify(e.get("not-saying")), /October|2023|paraglid|screenshot|video|post by/i);
  assert.match(textOf(e.get("why-withheld")), /whether a link is itself a publication is not settled law/);
  assert.match(textOf(e.get("why-withheld")), /No order covers the material we hold/);
  assert.doesNotMatch(textOf(e.get("can-say")), /videos on X|social media/);
  assert.match(textOf(e.get("why-withheld")), /a quoted phrase is a search term/);
  assert.equal(e.get("our-view").kind, "Our commentary");
  assert.doesNotMatch(textOf(e.get("can-say")), /pleaded/);
  assert.match(textOf(e.get("our-assumption")), /we state it as our assumption, not as the CPS’s position/);
  // Restrictions: the publisher's duty, the mandatory preparatory hearing, and the section 37 note verbatim.
  assert.ok(quotes("publishers-job")[0].includes("responsibility of the publisher to find out what reporting restrictions exist"));
  assert.ok(quotes("automatic").some((q) => q.includes("only this judgment, and those particulars identified in section 37(9)")));
  assert.match(textOf(e.get("automatic")), /must order a preparatory hearing/);
  assert.equal(e.get("restrictions-here").kind, "Coverage limitation");
  // The charge table uses the correct Acts, whatever the police announcement said.
  assert.deepEqual(e.get("can-say-charge").table.rows.map((r) => r[1]), ["Terrorism Act 2006, s 1", "Terrorism Act 2006, s 2", "Terrorism Act 2000, s 12(1A)", "Regulation of Investigatory Powers Act 2000, s 53"]);
  // The Terrorism Act 2006, not 2000, holds the dissemination offence.
  assert.match(p.sources.find((s) => s.id === "ta06-s2").url, /ukpga\/2006\/11\/section\/2$/);
});

test("the reform tracker keeps law in force apart from proposals", async () => {
  const p = await json("data/profiles/speech-law-reform.json");
  validateProfile(p, (message) => assert.fail(message));
  const e = entriesOf(p);
  const rows = Object.fromEntries(e.get("hefos-stages").table.rows.map((r) => [r[0], r[2]]));
  assert.match(rows["Section 4"], /Not in force; repeal intended/);
  assert.match(rows["Section 8"], /1 September 2026/);
  assert.equal(e.get("prosperity-proposals").kind, "Think-tank proposal, attributed");
  assert.equal(e.get("reform-commentary").kind, "Our commentary");
  assert.match(textOf(e.get("timothy-bill")), /no second reading/);
  assert.match(textOf(e.get("ofs-scheme")), /Ninety days is the longest a complainant normally has to wait, not the shortest/);
  assert.ok(e.get("sussex").paragraphs.some((x) => x.quote && x.text.includes("I am not determining any of the issues or facts surrounding what happened to Professor Stock")));
  assert.equal(e.get("against-the-index").table.rows.find((r) => r[0].startsWith("Online Safety Act 2023, s 181"))[2], "Keep");
});

test("the Craig Murray placeholder is labelled as one and sticks to the reported contempt case", async () => {
  const p = await json("data/profiles/craig-murray.json");
  validateProfile(p, (message) => assert.fail(message));
  assert.match(p.status_note, /^Placeholder/);
  const e = entriesOf(p);
  assert.match(textOf(e.get("finding")), /section 11 of the Contempt of Court Act 1981/);
  assert.match(textOf(e.get("sentence")), /On 11 May 2021 the court imposed eight months’ imprisonment/);
  assert.equal(e.get("finding").citation, "HM Advocate v Craig Murray [2021] HCJ 2");
  assert.equal(e.get("gaps").kind, "Coverage limitation");
});

test("the profile renderer frames embargoed paragraphs without the faded withheld text", async () => {
  const html = await read("public/research/reporting-limits/index.html");
  assert.match(html, /class="profile-embargo"/);
  assert.match(html, /Not published until the case ends/);
  assert.doesNotMatch(html, /infiltration/i);
});

test("the live register keeps Sarah Wilkinson's case to the reportable particulars", async () => {
  const p = await json("data/profiles/speech-offences.json");
  const e = new Map(p.sections.flatMap((s) => s.entries).map((x) => [x.id, x]));
  const live = JSON.stringify([e.get("wilkinson-current-focus"), e.get("sarah-wilkinson"), p.sections[0].title, p.highlights]).replace(/"id":"[^"]*"/g, "");
  assert.doesNotMatch(live, /plea|PIN\b|phone-PIN|mobile-phone/i);
  assert.equal(e.has("wilkinson-focus-evidence"), false);
  const pa = await read("data/collections/palestine-action/imports/cases.json");
  assert.doesNotMatch(pa, /terrorism connection at sentence/);
});
