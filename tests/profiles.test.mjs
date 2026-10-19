import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProfile } from "../scripts/profiles.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));
const source = () => json("data/profiles/roger-hallam.json");

test("Richard Heart separates the dismissed civil case, allegations and confirmed detention", async () => {
  const p = await json("data/profiles/richard-heart.json");
  validateProfile(p, (message) => assert.fail(message));
  const html = await read("public/research/richard-heart/index.html");
  assert.match(html, /territorial scope/);
  assert.match(html, /jurisdictional only misses/);
  assert.match(html, /17 October 2026/);
  assert.match(html, /No final Finnish criminal judgment/);
  assert.match(html, /not an international arrest warrant/);
  assert.match(html, /recipient’s account of a community fundraiser/);
  assert.match(html, /href="\/people\/"/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  const numbers = [...html.matchAll(/aria-label="Source (\d+):/g)].map((match) => Number(match[1]));
  const firstCitations = [...new Set(numbers)];
  assert.deepEqual(firstCitations, firstCitations.map((_, i) => i + 1));
  for (const s of p.sources) assert.ok(html.includes(`href="${s.url}" target="_blank" rel="noopener noreferrer"`), s.id);
  const exported = await json("public/data/profiles/richard-heart.json");
  assert.deepEqual(exported.provenance, p.provenance);
});

test("people category contains people, not legal studies, and is discoverable", async () => {
  const html = await read("public/people/index.html");
  assert.match(html, /People &amp; public records/);
  assert.match(html, /Inclusion is not a judgment of character/);
  const profiles = (await json("public/data/profiles.json")).profiles;
  const tiles = (await json("public/data/tiles.json")).tiles;
  for (const p of profiles) {
    assert.equal(html.includes(`href="/research/${p.id}/"`), p.category !== "legal-study", p.id);
    assert.equal(tiles.find((t) => t.id === p.id).tags.includes("people"), p.category !== "legal-study");
  }
  for (const file of ["public/sitemap.xml", "public/llms.txt"]) assert.ok((await read(file)).includes("/people/"), file);
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) assert.ok((await read(file)).includes("/research/richard-heart/"), file);
});

test("Menon profile distinguishes jurisdiction, a case to answer and final contempt findings", async () => {
  const p = await json("data/profiles/rajiv-menon-kc.json");
  const errors = [];
  validateProfile(p, (message) => errors.push(message));
  assert.deepEqual(errors, []);
  const text = JSON.stringify(p);
  assert.match(text, /1993/);
  assert.match(text, /2011/);
  assert.match(text, /\[2026\] EWCA Civ 573/);
  assert.match(text, /\[2026\] EWCA Crim 966/);
  assert.match(text, /not a final acquittal/);
  assert.match(text, /Menon disputes the accusation/);
  assert.match(text, /No final contempt judgment or later appeal outcome has been established/);
  assert.match(text, /ordered a stay/);
});

test("Hamas deproscription study identifies Ansari and separates reported progress from legal status", async () => {
  const p = await json("data/profiles/hamas-deproscription.json");
  const errors = [];
  validateProfile(p, (message) => errors.push(message));
  assert.deepEqual(errors, []);
  assert.equal(p.category, "legal-study");
  const text = JSON.stringify(p);
  assert.match(text, /Fahad Ansari/);
  assert.match(text, /Riverway Law/);
  assert.match(text, /Hamas remains a proscribed terrorist organisation in the UK/);
  assert.match(text, /2025-04-09/);
  assert.match(text, /appeal in August 2025/);
  assert.match(text, /underlying refusal letter and procedural orders have not been independently inspected/);
  assert.match(text, /Scheduled dates are not evidence/);
  assert.match(text, /ceased trading in its existing form/);
  assert.match(text, /not an automated monitoring service/);
  assert.ok(p.sources.some((s) => s.id === "home-office" && s.type.startsWith("Official")));
});

test("new pages have homepage tiles, shared discovery, sequential citations and working anchors", async () => {
  for (const [id, kind] of [["rajiv-menon-kc", "profile"], ["hamas-deproscription", "study"]]) {
    const p = await json(`data/profiles/${id}.json`);
    const html = await read(`public/research/${id}/index.html`);
    assert.ok(html.includes(`<h1>${p.title}</h1>`));
    const firstCitations = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
    assert.deepEqual(firstCitations, p.sources.map((_, i) => i + 1));
    const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(anchors).size, anchors.length);
    for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(m[1]));
    for (const s of p.sources) assert.ok(html.includes(`href="${s.url}" target="_blank" rel="noopener noreferrer"`));
    for (const file of ["public/research/index.html", "public/research/palestine-action/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) assert.ok((await read(file)).includes(`/research/${id}/`), file);
    const { tiles } = await json("public/data/tiles.json");
    assert.equal(tiles.find((t) => t.id === id).kind, kind);
    const exported = await json(`public/data/profiles/${id}.json`);
    for (const section of exported.sections) for (const entry of section.entries) for (const para of entry.paragraphs) for (const ref of para.sources) assert.ok(ref.url && ref.type && ref.checked);
  }
  const index = await read("public/research/index.html");
  assert.ok(index.indexOf('/research/hamas-deproscription/') < index.indexOf('Open justice and reporting restrictions'));
});

test("Middlebrough profile distinguishes later reporting, personal statements and other trials", async () => {
  const p = await json("data/profiles/sean-middlebrough.json");
  const errors = [];
  validateProfile(p, (error) => errors.push(error));
  assert.deepEqual(errors, []);
  assert.equal(p.checked, "2026-10-19");
  assert.equal(p.sections[0].id, "later-reporting");
  const text = JSON.stringify(p);
  assert.match(text, /convicted Middlebrough of criminal damage in August 2026, in his absence/);
  assert.match(text, /denied the outstanding violent-disorder allegation/);
  assert.match(text, /not one of the five defendants/);
  assert.match(text, /not a legal status/);
  assert.match(text, /not reconciled these accounts against the bail order/);
  assert.match(text, /No later sentence, appeal outcome or custody status is established/);
  const html = await read("public/research/sean-middlebrough/index.html");
  assert.match(html, /<h1>Sean Middlebrough<\/h1>/);
  const firstCitations = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
  assert.deepEqual(firstCitations, [1, 2, 3]);
  for (const s of p.sources) assert.ok(html.includes(`href="${s.url}" target="_blank" rel="noopener noreferrer"`));
  for (const link of p.research_links) assert.ok(html.includes(`href="/research/${link.id}/"`));
  for (const file of ["public/research/index.html", "public/research/filton6/index.html", "public/research/palestine-action/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(file)).includes("/research/sean-middlebrough/"), file);
  }
  const exported = await json("public/data/profiles/sean-middlebrough.json");
  assert.equal(exported.sources.length, 3);
  for (const section of exported.sections) for (const entry of section.entries) for (const para of entry.paragraphs) for (const ref of para.sources) assert.ok(ref.url && ref.publisher && ref.type);
});

test("Hallam profile keeps sourced outcomes separate from mentions and biography", async () => {
  const p = await source();
  const errors = [];
  validateProfile(p, (error) => errors.push(error));
  assert.deepEqual(errors, []);
  assert.equal(p.checked, "2026-10-17");
  assert.match(p.scope, /not an entry in a judges database/);
  assert.match(p.scope, /Not a complete criminal record/);
  const cases = p.sections.find((s) => s.id === "as-a-defendant").entries;
  assert.deepEqual(cases.map((c) => c.citation), ["Maxey & Hallam v R [2025] EWCA Crim 472", "Hallam & Ors v R [2025] EWCA Crim 199"]);
  assert.equal(p.sections.find((s) => s.id === "other-judgments").entries.length, 4);
  assert.ok(p.sources.some((s) => s.id === "uksc" && s.date === "2025-10-08"));
  const text = JSON.stringify(p);
  assert.match(text, /five-week Inner London sentence and Lewes suspended sentence are discussed under Louise Lancaster/);
  assert.match(text, /current custody status/);
  assert.match(text, /not proof that the jury accepted a particular legal argument/);
  assert.doesNotMatch(text, /magistrates.*not published anywhere/i);
});

test("Hallam page has source links, working anchors and metadata", async () => {
  const p = await source();
  const html = await read("public/research/roger-hallam/index.html");
  assert.match(html, /<h1>Roger Hallam<\/h1>/);
  assert.match(html, /<title>Roger Hallam — Independent Tribunal<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/independenttribunal.org\/research\/roger-hallam\/"/);
  assert.ok(html.indexOf('id="later-developments"') < html.indexOf('id="as-a-defendant"'));
  for (const s of p.sources) assert.ok(html.includes(`href="${s.url}"`), s.id);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "unique HTML anchors");
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.match(html, /not a fresh merits judgment/);
  assert.match(html, /Not a complete criminal record/);
});

test("profiles are discoverable and preserve paragraph-level attribution in exports", async () => {
  const p = await json("public/data/profiles/roger-hallam.json");
  const collection = await json("public/data/profiles.json");
  assert.deepEqual(collection.profiles.find((profile) => profile.id === p.id), p);
  assert.equal(collection.profiles.length, 12);
  assert.equal(p.url, "https://independenttribunal.org/research/roger-hallam/");
  for (const s of p.sections) for (const entry of s.entries) for (const para of entry.paragraphs) for (const ref of para.sources) {
    assert.ok(ref.title && ref.type && ref.publisher && ref.checked);
    assert.match(ref.url, /^https:\/\//);
  }
  for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
    assert.ok((await read(file)).includes("/research/roger-hallam/"), file);
  }
  const full = await read("public/llms-full.txt");
  assert.match(full, /not an entry in a judges database/);
  assert.match(full, /Supreme Court/);
  assert.match(full, /Self-description/);
  assert.ok(full.includes("https://supremecourt.uk/cases/uksc-2025-0096"));
  const { tiles } = await json("public/data/tiles.json");
  assert.equal(tiles.find((t) => t.id === p.id).kind, "profile");
  const index = await json("public/data/index.json");
  assert.equal(index.datasets.find((d) => d.id === "profiles").count, collection.profiles.length);
  assert.equal(index.datasets.find((d) => d.id === "research").count, 6, "historical imports remain a distinct dataset");
});

test("profile validation rejects broken citations and unsafe or duplicate anchors", async () => {
  const original = await source();
  for (const [mutate, pattern] of [
    [(p) => { p.sections[0].entries[0].paragraphs[0].sources[0].id = "missing-source"; }, /unknown source/],
    [(p) => { p.sections[1].id = p.sections[0].id; }, /duplicate anchor/],
    [(p) => { p.sources[0].url = "javascript:alert(1)"; }, /HTTPS/],
    [(p) => { p.sections[0].entries[0].paragraphs[0].sources = []; }, /factual paragraph requires sources/],
    [(p) => { p.highlights[0].target = "absent"; }, /existing target/],
    [(p) => { p.checked = "today"; }, /checked date/],
  ]) {
    const p = structuredClone(original);
    mutate(p);
    const errors = [];
    validateProfile(p, (error) => errors.push(error));
    assert.match(errors.join("\n"), pattern);
  }
});

test("open-justice studies distinguish the orders, findings and analysis", async () => {
  const studies = await Promise.all(["super-injunctions", "anonymity-orders", "jigsaw-identification"].map((id) => json(`data/profiles/${id}.json`)));
  for (const p of studies) {
    const errors = [];
    validateProfile(p, (error) => errors.push(error));
    assert.deepEqual(errors, []);
    assert.equal(p.category, "legal-study");
    assert.equal(p.related.length, 2);
    assert.ok(p.sections.some((s) => s.intro.includes("Independent Tribunal analysis")));
  }
  const [superInjunctions, anonymity, jigsaw] = studies.map((p) => JSON.stringify(p));
  assert.match(superInjunctions, /Anonymity alone does not make an injunction super/);
  assert.match(anonymity, /not the merits/);
  assert.match(anonymity, /No names, speculative identities or identifying clues/);
  assert.match(anonymity, /2026\/oct\/16\/well-known-individual/);
  assert.match(jigsaw, /expressly rejected describing this as strict liability/);
  assert.match(jigsaw, /real or substantial risk/);
  assert.doesNotMatch(jigsaw, /no statutory lifelong anonymity|automatic early release|first person.*jailed/i);
});

test("legal-study pages have sequential first citations, safe links and related pages", async () => {
  for (const id of ["super-injunctions", "anonymity-orders", "jigsaw-identification"]) {
    const p = await json(`data/profiles/${id}.json`);
    const html = await read(`public/research/${id}/index.html`);
    assert.ok(html.includes(`<h1>${p.title}</h1>`));
    assert.ok(html.includes(`rel="canonical" href="https://independenttribunal.org/research/${id}/"`));
    const firstCitations = [...new Set([...html.matchAll(/aria-label="Source (\d+):/g)].map((m) => Number(m[1])))];
    assert.deepEqual(firstCitations, p.sources.map((_, i) => i + 1));
    for (const s of p.sources) {
      assert.ok(html.includes(`href="${s.url.replaceAll("&", "&amp;")}" target="_blank" rel="noopener noreferrer"`), s.id);
    }
    const anchors = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(anchors).size, anchors.length);
    for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.includes(m[1]));
    for (const r of p.related) assert.ok(html.includes(`href="/research/${r.id}/"`));
    for (const file of ["public/research/index.html", "public/sitemap.xml", "public/llms.txt", "public/llms-full.txt"]) {
      assert.ok((await read(file)).includes(`/research/${id}/`), file);
    }
    const exported = await json(`public/data/profiles/${id}.json`);
    for (const s of exported.sections) for (const e of s.entries) for (const para of e.paragraphs) for (const ref of para.sources) {
      assert.ok(ref.url && ref.publisher && ref.checked && ref.type);
    }
    const { tiles } = await json("public/data/tiles.json");
    assert.equal(tiles.find((t) => t.id === id).kind, "study");
  }
});
