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
  assert.deepEqual(c.chapters.map((ch) => ch.title), ["Grossly offensive", "Private chats and cloud notes", "Supporting Hamas", "Supporting Palestine Action", "Defamation", "“Your mother was raped by a dog”", "Message ultra", "The case register"]);
  const html = await read("public/speech-offences/index.html");
  for (const ch of c.chapters) assert.ok(html.includes(`href="${ch.href}"`), ch.href);
  assert.match(html, /Nothing here supports any proscribed organisation/);
  assert.ok((await read("public/sitemap.xml")).includes("https://independenttribunal.org/speech-offences/"));
  assert.ok((await read("public/llms.txt")).includes("[Speech offences](https://independenttribunal.org/speech-offences/)"));
  assert.ok((await read("public/llms-full.txt")).includes("Message ultra <https://independenttribunal.org/research/message-ultra/>"));
  assert.equal((await json("public/data/categories/speech-offences.json")).chapters.length, 8);
  assert.ok((await json("data/navigation.json")).links.some((l) => l.href === "/speech-offences/"));
  // The validator rejects a missing page and a missing anchor.
  const errors = [];
  const targets = new Map([["/research/grossly-offensive/", new Set(["private"])]]);
  validateCategory({ ...c, file: "speech-offences.json", chapters: [{ title: "x", summary: "y", href: "/research/grossly-offensive/#nowhere" }, { title: "x", summary: "y", href: "/research/missing/" }], related: [] }, targets, (_, m) => errors.push(m));
  assert.deepEqual(errors, ["unknown anchor /research/grossly-offensive/#nowhere", "unknown page /research/missing/"]);
});
